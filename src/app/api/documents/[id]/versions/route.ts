// app/api/documents/[id]/versions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getIAMToken } from '@/lib/yc-iam';
import { getDocumentVersionS3Key } from '@/lib/s3-path';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

function encodeMetadata(value: string): string {
  return Buffer.from(value).toString('base64');
}

async function uploadFileWithIAM(
  bucket: string,
  key: string,
  fileBuffer: Buffer,
  contentType: string,
  metadata: Record<string, string>
) {
  const iamToken = await getIAMToken();
  const url = `https://storage.yandexcloud.net/${bucket}/${key}`;
  const headers: Record<string, string> = {
    Host: 'storage.yandexcloud.net',
    'Content-Type': contentType,
    'Content-Length': fileBuffer.length.toString(),
    Authorization: `Bearer ${iamToken}`,
  };
  Object.entries(metadata).forEach(([k, value]) => {
    headers[`X-Amz-Meta-${k.toLowerCase()}`] = encodeMetadata(value);
  });
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: new Uint8Array(fileBuffer),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  return true;
}

// GET /api/documents/:id/versions - список всех версий
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = await connectDB();

  try {
    const { rows } = await client.query(
      `SELECT id, document_id, document_number, document_name, file_name, file_path,
              file_type, file_size, checksum, uploaded_by, uploaded_at, change_reason
       FROM document_version
       WHERE document_id = $1
       ORDER BY document_number DESC`,
      [id]
    );

    if (rows.length === 0) {
      const { rowCount } = await client.query('SELECT 1 FROM document WHERE id = $1', [id]);
      if (rowCount === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ versions: rows });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

// POST /api/documents/:id/versions - загрузка новой версии
async function uploadVersionHandler(
  request: NextRequest,
  documentId: string,
  preloadedData?: any
) {
  const id = documentId;
  const client = await connectDB();

  try {
    const formData = preloadedData?.formData || (await request.formData());
    const file = formData.get('file') as File;
    const changeReason = (formData.get('changeReason') as string) || undefined;
    const resetStatusToDraft = formData.get('resetStatusToDraft') !== 'false';
    const uploadedBy = formData.get('uploadedBy') as string;

    if (!file || !uploadedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: file, uploadedBy' },
        { status: 400 }
      );
    }

    const { rows: docRows } = await client.query(
      'SELECT id, study_id, site_id, folder_id, folder_name FROM document WHERE id = $1 AND is_deleted = false',
      [id]
    );

    if (docRows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docRows[0];
    const studyId = doc.study_id;
    const folderId = doc.folder_id;

    const { rows: countRows } = await client.query(
      'SELECT COALESCE(MAX(document_number), 0) as max_num FROM document_version WHERE document_id = $1',
      [id]
    );
    const nextNumber = (countRows[0]?.max_num || 0) + 1;

    const versionId = uuidv4();
    const ext = file.name.split('.').pop() || 'pdf';
    const s3Key = getDocumentVersionS3Key(studyId, folderId, id, nextNumber, versionId, ext);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const maxSize = 100 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB' },
        { status: 400 }
      );
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');
    const fileName = formData.get('fileName') as string || file.name;
    const documentName = (formData.get('documentName') as string) || file.name.replace(/\.[^/.]+$/, '');

    await uploadFileWithIAM(
      process.env.YC_BUCKET_NAME!,
      s3Key,
      buffer,
      file.type,
      {
        documentid: id,
        versionid: versionId,
        studyid: String(studyId),
        siteid: String(doc.site_id || ''),
        folderid: folderId,
        filename: fileName,
        uploadedby: uploadedBy,
      }
    );

    const fileUrl = `https://storage.yandexcloud.net/${process.env.YC_BUCKET_NAME}/${s3Key}`;

    const { rows: [newVersion] } = await client.query(
      `INSERT INTO document_version (
        id, document_id, document_number, document_name,
        file_name, file_path, file_type, file_size, checksum,
        uploaded_by, change_reason, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        versionId,
        id,
        nextNumber,
        documentName,
        fileName,
        fileUrl,
        file.type,
        file.size,
        checksum,
        uploadedBy,
        changeReason || `Version ${nextNumber} upload`,
        new Date().toISOString()
      ]
    );

    const statusUpdate = resetStatusToDraft ? ", status = 'draft'" : '';
    await client.query(
      `UPDATE document SET current_version_id = $1 ${statusUpdate}
       WHERE id = $2`,
      [versionId, id]
    );

    const { rows: [updatedDoc] } = await client.query('SELECT * FROM document WHERE id = $1', [id]);

    return NextResponse.json(
      {
        document: updatedDoc,
        version: newVersion,
        versions: [newVersion],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading version:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const POST = async (
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) => {
  const { id } = await ctx.params;
  let formData: FormData | null = null;
  try {
    formData = await request.formData();
  } catch {
    // ignore
  }

  const auditConfig: AuditConfig = {
    action: 'UPDATE' as AuditAction,
    entityType: 'document' as AuditEntity,

    getEntityId: () => 0,

    getStudyId: (_req, body?: any) => (body?.studyId ? parseInt(body.studyId) : 0),
    getSiteId: (_req, body?: any) => body?.siteId ?? '',

    getNewValue: (_req, body?: any) => body || null,
    getOldValue: async () => null,
  };

  return withAudit(auditConfig)(request, async (preloadedData?: any) => {
    return uploadVersionHandler(request, id, { formData, ...preloadedData });
  });
};
