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
import { DocumentStatus } from '@/types/document';

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
    // Получаем версии с информацией о пользователях
    const { rows } = await client.query(
      `SELECT 
        dv.id, 
        dv.document_id, 
        dv.document_number, 
        dv.document_name, 
        dv.file_name, 
        dv.file_path,
        dv.file_type, 
        dv.file_size, 
        dv.checksum, 
        dv.uploaded_by, 
        dv.uploaded_at, 
        dv.change_reason,
        dv.review_status,
        dv.review_submitted_by,
        dv.review_submitted_at,
        dv.review_submitted_to,
        dv.reviewed_by,
        dv.reviewed_at,
        dv.review_comment,
        -- Информация о загрузившем
        uploader.name as uploader_name,
        uploader.email as uploader_email,
        -- Информация о ревьюере
        reviewer.name as reviewer_name,
        reviewer.email as reviewer_email,
        -- Информация об утверждающем
        approver.name as approver_name,
        approver.email as approver_email,
        -- Информация о назначенном ревьюере
        assigned.name as assigned_name,
        assigned.email as assigned_email
       FROM document_version dv
       LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
       LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
       LEFT JOIN users approver ON dv.reviewed_by = approver.id
       LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
       WHERE dv.document_id = $1
       ORDER BY dv.document_number DESC`,
      [id]
    );

    if (rows.length === 0) {
      const { rowCount } = await client.query('SELECT 1 FROM document WHERE id = $1', [id]);
      if (rowCount === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
    }

    // Форматируем ответ с пользовательскими данными
    const formattedVersions = rows.map(v => ({
      id: v.id,
      document_id: v.document_id,
      document_number: v.document_number,
      document_name: v.document_name,
      file_name: v.file_name,
      file_path: v.file_path,
      file_type: v.file_type,
      file_size: v.file_size,
      checksum: v.checksum,
      uploaded_by: v.uploaded_by,
      uploaded_at: v.uploaded_at,
      change_reason: v.change_reason,
      review_status: v.review_status,
      review_submitted_at: v.review_submitted_at,
      reviewed_at: v.reviewed_at,
      review_comment: v.review_comment,
      uploader: v.uploader_name ? {
        id: v.uploaded_by,
        name: v.uploader_name,
        email: v.uploader_email
      } : null,
      reviewer: v.reviewer_name ? {
        id: v.review_submitted_by,
        name: v.reviewer_name,
        email: v.reviewer_email
      } : null,
      approver: v.approver_name ? {
        id: v.reviewed_by,
        name: v.approver_name,
        email: v.approver_email
      } : null,
      assigned_reviewer: v.assigned_name ? {
        id: v.review_submitted_to,
        name: v.assigned_name,
        email: v.assigned_email
      } : null
    }));

    return NextResponse.json({ versions: formattedVersions });
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
    // При загрузке новой версии статус всегда сбрасывается в draft
    const resetStatusToDraft = true; // Всегда сбрасываем статус при новой версии
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

    // Новая версия всегда создается со статусом null (не на ревью)
    const { rows: [newVersion] } = await client.query(
      `INSERT INTO document_version (
        id, document_id, document_number, document_name,
        file_name, file_path, file_type, file_size, checksum,
        uploaded_by, change_reason, uploaded_at,
        review_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        new Date().toISOString(),
        null // review_status = null для новой версии
      ]
    );

    // Обновляем current_version_id в документе
    await client.query(
      `UPDATE document SET current_version_id = $1 WHERE id = $2`,
      [versionId, id]
    );

    // Получаем обновленный документ со статусом из последней версии
    const { rows: [updatedDoc] } = await client.query(`
      SELECT 
        d.*,
        lv.review_status,
        lv.document_number,
        lv.document_name,
        lv.file_name,
        lv.file_path,
        lv.file_type,
        lv.file_size,
        lv.checksum,
        lv.uploaded_at,
        lv.change_reason,
        -- Определяем статус документа на основе review_status
        CASE 
          WHEN lv.review_status = 'approved' THEN 'approved'
          WHEN lv.review_status = 'submitted' THEN 'in_review'
          WHEN lv.review_status = 'rejected' THEN 'draft'
          ELSE 'draft'
        END as document_status
      FROM document d
      LEFT JOIN document_version lv ON d.current_version_id = lv.id
      WHERE d.id = $1
    `, [id]);

    return NextResponse.json(
      {
        document: {
          ...updatedDoc,
          status: updatedDoc.document_status || 'draft'
        },
        version: newVersion,
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