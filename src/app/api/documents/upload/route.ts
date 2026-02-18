// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, createTable } from '@/lib/db/index';
import { Tables } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { getIAMToken } from '@/lib/yc-iam';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';


// Функция для кодирования метаданных в ASCII
function encodeMetadata(value: string): string {
  return Buffer.from(value).toString('base64');
}

// Функция для загрузки файла напрямую через fetch с IAM токеном
async function uploadFileWithIAM(
  bucket: string,
  key: string,
  fileBuffer: Buffer,
  contentType: string,
  metadata: Record<string, string>
) {
  try {
    const iamToken = await getIAMToken();
    
    const url = `https://storage.yandexcloud.net/${bucket}/${key}`;
    
    const headers: Record<string, string> = {
      'Host': 'storage.yandexcloud.net',
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'Authorization': `Bearer ${iamToken}`,
    };
    
    Object.entries(metadata).forEach(([key, value]) => {
      const encodedValue = encodeMetadata(value);
      headers[`X-Amz-Meta-${key.toLowerCase()}`] = encodedValue;
    });

    const uint8Array = new Uint8Array(fileBuffer);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: uint8Array,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error('Error in uploadFileWithIAM:', error);
    throw error;
  }
}

// Основная функция обработки загрузки
async function uploadHandler(request: NextRequest, preloadedData?: any) {
  const client = await connectDB();
  
  try {
    await createTable(Tables.DOCUMENT);
    await createTable(Tables.DOCUMENT_VERSION);

    // Используем preloadedData если он есть, иначе читаем formData
    const formData = preloadedData?.formData || await request.formData();
    
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;
    const versionId = formData.get('versionId') as string;
    const s3Key = formData.get('s3Key') as string;
    const studyId = parseInt(formData.get('studyId') as string);
    const siteId = formData.get('siteId') as string;
    const folderId = formData.get('folderId') as string;
    const folderName = formData.get('folderName') as string;
    const createdBy = formData.get('createdBy') as string;
    const fileName = formData.get('fileName') as string;

    const documentName = formData.get('documentName') as string;

    const fileSize = parseInt(formData.get('fileSize') as string);
    const fileType = formData.get('fileType') as string;
    const tmfZone = formData.get('tmfZone') as string | null;
    const tmfArtifact = formData.get('tmfArtifact') as string | null;

    // Валидация
    if (
      !file ||
      studyId === undefined ||
      Number.isNaN(studyId) ||
      !siteId ||
      !folderId ||
      !folderName ||
      !createdBy
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

    try {
      await uploadFileWithIAM(
        process.env.YC_BUCKET_NAME!,
        s3Key,
        buffer,
        file.type,
        {
          documentid: documentId,
          versionid: versionId,
          studyid: studyId.toString(),
          siteid: siteId,
          folderid: folderId,
          filename: fileName,
          uploadedby: createdBy,
        }
      );
    } catch (uploadError) {
      console.error('Failed to upload to S3:', uploadError);
      return NextResponse.json(
        { 
          error: 'Failed to upload file to storage', 
          details: uploadError instanceof Error ? uploadError.message : String(uploadError) 
        },
        { status: 500 }
      );
    }

    const fileUrl = `https://storage.yandexcloud.net/${process.env.YC_BUCKET_NAME}/${s3Key}`;

    const { rows: [newDocument] } = await client.query(`
      INSERT INTO document (
        id, study_id, site_id, folder_id, folder_name, 
        tmf_zone, tmf_artifact, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      documentId,
      studyId,
      siteId,
      folderId,
      folderName,
      tmfZone || null,
      tmfArtifact || null,
      'draft',
      createdBy,
      new Date().toISOString()
    ]);

    const { rows: existingVersions } = await client.query(`
      SELECT COUNT(*) as count FROM document_version WHERE document_id = $1
    `, [documentId]);
    
    const versionNumber = (existingVersions[0]?.count || 0) + 1;

    const { rows: [newVersion] } = await client.query(`
      INSERT INTO document_version (
        id, document_id, document_number, document_name,
        file_name, file_path, file_type, file_size, checksum,
        uploaded_by, change_reason, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      versionId,
      documentId,
      versionNumber,
      documentName,
      fileName,
      fileUrl,
      fileType,
      fileSize,
      checksum,
      createdBy,
      versionNumber === 1 ? 'Initial upload' : `Version ${versionNumber} upload`,
      new Date().toISOString()
    ]);

    const result = {
      document: {
        ...newDocument,
        current_version: newVersion,
        versions: [newVersion]
      }
    };

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Оборачиваем handler в withAudit
export const POST = async (request: NextRequest) => {
  // Читаем formData один раз здесь
  let formData: FormData | null = null;
  
  try {
    formData = await request.formData();
  } catch (error) {
    console.error('Failed to parse form data:', error);
  }

  // Извлекаем данные для аудита из formData
  const auditData = formData ? {
    fileName: formData.get('fileName'),
    folderId: formData.get('folderId'),
    folderName: formData.get('folderName'),
    fileSize: formData.get('fileSize'),
    fileType: formData.get('fileType'),
    studyId: formData.get('studyId'),
    siteId: formData.get('siteId'),
    tmfZone: formData.get('tmfZone'),
    tmfArtifact: formData.get('tmfArtifact')
  } : null;

  const auditConfig: AuditConfig = {
    action: 'CREATE' as AuditAction,
    entityType: 'DOCUMENT' as AuditEntity,
    
    getEntityId: (req: NextRequest) => {
      return 0;
    },
    
    getStudyId: (req: NextRequest, body?: any) => {
      // Получаем из preloadedData или из сохраненных данных
      return body?.studyId ? parseInt(body.studyId) : 0;
    },
    
    getSiteId: (req: NextRequest, body?: any) => {
      return body?.siteId || '';
    },
    
    getNewValue: (req: NextRequest, body?: any) => {
      // Используем данные из body (preloadedData)
      return body || null;
    },
    
    getOldValue: async (req: NextRequest, body?: any) => {
      // Для CREATE операции старое значение не нужно
      return null;
    }
  };

  return withAudit(auditConfig)(request, async (preloadedData?: any) => {
    // Передаем formData и auditData в handler через preloadedData
    return uploadHandler(request, { formData, ...auditData });
  });
};