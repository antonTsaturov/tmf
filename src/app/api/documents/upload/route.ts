// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool, createTable, DB_INITIALIZED } from '@/lib/db/index';
import { Tables } from '@/lib/db/schema';
import { createHash } from 'crypto';
import { getIAMToken } from '@/lib/yc-iam';
import { withAudit, AuditContext } from '@/lib/audit/audit.middleware';

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
async function uploadHandler(
  request: NextRequest,
  ctx: AuditContext
) {
  const client = getPool();
  
  try {

    if (!DB_INITIALIZED) {
      await createTable(Tables.DOCUMENT);
      await createTable(Tables.DOCUMENT_VERSION);
    }

    const formData = ctx.formData!;

    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;
    const versionId = formData.get('versionId') as string;
    const s3Key = formData.get('s3Key') as string;
    const studyId = parseInt(formData.get('studyId') as string);
    const siteId = formData.get('siteId') as string || null;
    const country = formData.get('country') as string || null;
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

      const metadata: Record<string, string> = {
        documentid: documentId,
        versionid: versionId,
        studyid: studyId.toString(),
        folderid: folderId,
        filename: fileName,
        uploadedby: String(createdBy),
      };

      if (siteId) {
        metadata.siteid = siteId;
      }

      if (country) {
        metadata.country = country;
      }

      await uploadFileWithIAM(
        process.env.YC_BUCKET_NAME!,
        s3Key,
        buffer,
        file.type,
        metadata
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

  const normalizedSiteId = (siteId === 'undefined' || siteId === undefined || siteId === null || siteId === '') 
    ? null 
    : siteId;
    
    // Вставляем документ
    const { rows: [newDocument] } = await client.query(`
      INSERT INTO document (
        id, study_id, site_id, country, folder_id, folder_name, 
        tmf_zone, tmf_artifact, created_by, created_at,
        is_deleted, is_archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, false)
      RETURNING *
    `, [
      documentId,
      studyId,
      normalizedSiteId,
      country || null,
      folderId,
      folderName,
      tmfZone || null,
      tmfArtifact || null,
      createdBy,
      new Date().toISOString()
    ]);

    // Получаем количество существующих версий
    const { rows: existingVersions } = await client.query(`
      SELECT COUNT(*) as count FROM document_version WHERE document_id = $1
    `, [documentId]);
    
    const versionNumber = (existingVersions[0]?.count || 0) + 1;

    // Вставляем версию документа
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

    // Обновляем current_version_id в документе
    await client.query(`
      UPDATE document SET current_version_id = $1 WHERE id = $2
    `, [versionId, documentId]);

    // Получаем все версии документа с информацией о пользователях
    const { rows: allVersions } = await client.query(`
      SELECT 
        dv.*,
        uploader.id as uploader_id,
        uploader.name as uploader_name,
        uploader.email as uploader_email,
        reviewer.id as reviewer_id,
        reviewer.name as reviewer_name,
        reviewer.email as reviewer_email,
        approver.id as approver_id,
        approver.name as approver_name,
        approver.email as approver_email,
        assigned.id as assigned_reviewer_id,
        assigned.name as assigned_reviewer_name,
        assigned.email as assigned_reviewer_email
      FROM document_version dv
      LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
      LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
      LEFT JOIN users approver ON dv.reviewed_by = approver.id
      LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
      WHERE dv.document_id = $1
      ORDER BY dv.document_number DESC
    `, [documentId]);

    // Форматируем версии
    const formattedVersions = allVersions.map(v => ({
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
      review_submitted_by: v.review_submitted_by,
      review_submitted_at: v.review_submitted_at,
      review_submitted_to: v.review_submitted_to,
      reviewed_by: v.reviewed_by,
      reviewed_at: v.reviewed_at,
      review_comment: v.review_comment,
      uploader: v.uploader_id ? {
        id: v.uploader_id,
        name: v.uploader_name,
        email: v.uploader_email
      } : null,
      reviewer: v.reviewer_id ? {
        id: v.reviewer_id,
        name: v.reviewer_name,
        email: v.reviewer_email
      } : null,
      approver: v.approver_id ? {
        id: v.approver_id,
        name: v.approver_name,
        email: v.approver_email
      } : null,
      assigned_reviewer: v.assigned_reviewer_id ? {
        id: v.assigned_reviewer_id,
        name: v.assigned_reviewer_name,
        email: v.assigned_reviewer_email
      } : null
    }));

    // Получаем информацию о создателе документа
    const { rows: [creatorInfo] } = await client.query(`
      SELECT id, name, email, role FROM users WHERE id = $1
    `, [createdBy]);

    // Формируем полный объект документа
    const enrichedDocument = {
      id: newDocument.id,
      study_id: newDocument.study_id,
      site_id: newDocument.site_id,
      folder_id: newDocument.folder_id,
      folder_name: newDocument.folder_name,
      tmf_zone: newDocument.tmf_zone,
      tmf_artifact: newDocument.tmf_artifact,
      created_at: newDocument.created_at,
      created_by: newDocument.created_by,
      is_deleted: newDocument.is_deleted || false,
      is_archived: newDocument.is_archived || false,
      status: 'draft',
      current_version: {
        ...formattedVersions[0],
        // Добавляем информацию о загрузившем в current_version для обратной совместимости
        uploader: formattedVersions[0]?.uploader || null
      },
      versions: formattedVersions,
      total_versions: formattedVersions.length,
      creator: creatorInfo ? {
        id: creatorInfo.id,
        name: creatorInfo.name,
        email: creatorInfo.email,
        role: creatorInfo.role
      } : null,
      // Поля для обратной совместимости
      document_number: formattedVersions[0]?.document_number,
      document_name: formattedVersions[0]?.document_name,
      file_name: formattedVersions[0]?.file_name,
      file_path: formattedVersions[0]?.file_path,
      file_type: formattedVersions[0]?.file_type,
      file_size: formattedVersions[0]?.file_size,
      checksum: formattedVersions[0]?.checksum,
      last_uploaded_by: formattedVersions[0]?.uploaded_by,
      last_uploaded_at: formattedVersions[0]?.uploaded_at,
      last_uploader: formattedVersions[0]?.uploader || null
    };

    return NextResponse.json({
      success: true,
      documents: [enrichedDocument]
    }, { status: 201 });

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
  } 
}

export const POST = withAudit(
  {
    action: 'CREATE',
    entityType: 'document',

    getEntityId: (ctx) => {
      return ctx.formData?.get('documentId') as string || '0';
    },

    getStudyId: (ctx) =>
      String(ctx.formData?.get('studyId') ?? ''),

    getSiteId: (ctx) =>
      String(ctx.formData?.get('siteId') ?? ''),

    getNewValue: (ctx) => ({
      fileName: ctx.formData?.get('fileName'),
      documentName: ctx.formData?.get('documentName'),
      folderId: ctx.formData?.get('folderId'),
      folderName: ctx.formData?.get('folderName'),
      fileSize: ctx.formData?.get('fileSize'),
      fileType: ctx.formData?.get('fileType'),
      tmfZone: ctx.formData?.get('tmfZone'),
      tmfArtifact: ctx.formData?.get('tmfArtifact')
    })
  },
  uploadHandler
);
