// // app/api/documents/[id]/versions/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { getPool } from '@/lib/db/index';
// import { v4 as uuidv4 } from 'uuid';
// import { createHash } from 'crypto';
// import { getDocumentVersionS3Key } from '@/lib/s3-path';
// import { AuditContext, withAudit } from '@/lib/audit/audit.middleware';
// import { AuditAction, AuditEntity } from '@/types/audit';
// import { uploadFileWithIAM } from '@/lib/s3-upload';


// // GET /api/documents/:id/versions - список всех версий
// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   const { id } = await params;
//   const client = getPool();

//   try {
//     const { rows } = await client.query(
//       `SELECT 
//         dv.id, 
//         dv.document_id, 
//         dv.document_number, 
//         dv.document_name, 
//         dv.file_name, 
//         dv.file_path,
//         dv.file_type, 
//         dv.file_size, 
//         dv.checksum, 
//         dv.uploaded_by, 
//         dv.uploaded_at, 
//         dv.change_reason,
//         dv.review_status,
//         dv.review_submitted_by,
//         dv.review_submitted_at,
//         dv.review_submitted_to,
//         dv.reviewed_by,
//         dv.reviewed_at,
//         dv.review_comment,
//         uploader.name as uploader_name,
//         uploader.email as uploader_email,
//         reviewer.name as reviewer_name,
//         reviewer.email as reviewer_email,
//         approver.name as approver_name,
//         approver.email as approver_email,
//         assigned.name as assigned_name,
//         assigned.email as assigned_email
//        FROM document_version dv
//        LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
//        LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
//        LEFT JOIN users approver ON dv.reviewed_by = approver.id
//        LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
//        WHERE dv.document_id = $1
//        ORDER BY dv.document_number DESC`,
//       [id]
//     );

//     if (rows.length === 0) {
//       const { rowCount } = await client.query('SELECT 1 FROM document WHERE id = $1', [id]);
//       if (rowCount === 0) {
//         return NextResponse.json({ error: 'Document not found' }, { status: 404 });
//       }
//     }

//     const formattedVersions = rows.map(v => ({
//       id: v.id,
//       document_id: v.document_id,
//       document_number: v.document_number,
//       document_name: v.document_name,
//       file_name: v.file_name,
//       file_path: v.file_path,
//       file_type: v.file_type,
//       file_size: v.file_size,
//       checksum: v.checksum,
//       uploaded_by: v.uploaded_by,
//       uploaded_at: v.uploaded_at,
//       change_reason: v.change_reason,
//       review_status: v.review_status,
//       review_submitted_at: v.review_submitted_at,
//       reviewed_at: v.reviewed_at,
//       review_comment: v.review_comment,
//       uploader: v.uploader_name ? {
//         id: v.uploaded_by,
//         name: v.uploader_name,
//         email: v.uploader_email
//       } : null,
//       reviewer: v.reviewer_name ? {
//         id: v.review_submitted_by,
//         name: v.reviewer_name,
//         email: v.reviewer_email
//       } : null,
//       approver: v.approver_name ? {
//         id: v.reviewed_by,
//         name: v.approver_name,
//         email: v.approver_email
//       } : null,
//       assigned_reviewer: v.assigned_name ? {
//         id: v.review_submitted_to,
//         name: v.assigned_name,
//         email: v.assigned_email
//       } : null
//     }));

//     return NextResponse.json({ versions: formattedVersions });
//   } catch (error) {
//     console.error('Error fetching versions:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   } 
// }

// // POST /api/documents/:id/versions - загрузка новой версии
// async function uploadNewVersionHandler(
//   request: NextRequest,
//   ctx: AuditContext
// ) {

//   const parts = request.nextUrl.pathname.split('/');
//   const id =  parts[parts.indexOf('documents') + 1] || '0';

//   const formData = ctx.formData!;
//   //const id = documentId;
//   const client = getPool();

//   try {
//     //const formData = preloadedData?.formData || (await request.formData());
//     const file = formData.get('file') as File;
//     const changeReason = (formData.get('changeReason') as string) || undefined;
//     const uploadedBy = formData.get('uploadedBy') as string;
//     const customFileName = formData.get('customFileName') as string | undefined;

//     if (!file || !uploadedBy) {
//       return NextResponse.json(
//         { error: 'Missing required fields: file, uploadedBy' },
//         { status: 400 }
//       );
//     }

//     // Получаем текущий документ (без document_name, так как его нет в таблице document)
//     const { rows: docRows } = await client.query(
//       `SELECT id, study_id, site_id, folder_id, folder_name 
//        FROM document 
//        WHERE id = $1 AND is_deleted = false`,
//       [id]
//     );

//     if (docRows.length === 0) {
//       return NextResponse.json({ error: 'Document not found' }, { status: 404 });
//     }

//     const doc = docRows[0];
//     const studyId = doc.study_id;
//     const folderId = doc.folder_id;

//     // Получаем document_name из текущей (последней) версии документа
//     const { rows: currentVersionRows } = await client.query(
//       `SELECT document_name 
//        FROM document_version 
//        WHERE document_id = $1 
//        ORDER BY document_number DESC 
//        LIMIT 1`,
//       [id]
//     );

//     // Если есть текущая версия, берем document_name из нее, иначе используем имя файла
//     const documentName = currentVersionRows.length > 0 
//       ? currentVersionRows[0].document_name 
//       : file.name.replace(/\.[^/.]+$/, '');

//     // Получаем следующий номер версии
//     const { rows: countRows } = await client.query(
//       'SELECT COALESCE(MAX(document_number), 0) as max_num FROM document_version WHERE document_id = $1',
//       [id]
//     );
//     const nextNumber = (countRows[0]?.max_num || 0) + 1;

//     const versionId = uuidv4();
//     const ext = file.name.split('.').pop() || 'pdf';
//     const s3Key = getDocumentVersionS3Key(studyId, folderId, id, nextNumber, versionId, ext);

//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     const maxSize = 100 * 1024 * 1024;
//     if (buffer.length > maxSize) {
//       return NextResponse.json(
//         { error: 'File too large. Maximum size is 100MB' },
//         { status: 400 }
//       );
//     }

//     const checksum = createHash('sha256').update(buffer).digest('hex');
    
//     // Определяем имя файла для сохранения
//     let fileNameToSave = customFileName || file.name;
    
//     // Если указано кастомное имя, добавляем расширение если его нет
//     if (customFileName && !customFileName.includes('.')) {
//       fileNameToSave = `${customFileName}.${ext}`;
//     }

//     await uploadFileWithIAM(
//       process.env.YC_BUCKET_NAME!,
//       s3Key,
//       buffer,
//       file.type,
//       {
//         documentid: id,
//         versionid: versionId,
//         studyid: String(studyId),
//         siteid: String(doc.site_id || ''),
//         folderid: folderId,
//         filename: fileNameToSave,
//         uploadedby: uploadedBy,
//       }
//     );

//     const fileUrl = `https://storage.yandexcloud.net/${process.env.YC_BUCKET_NAME}/${s3Key}`;

//     // Создаем новую версию с document_name из текущей версии
//     const { rows: [newVersion] } = await client.query(
//       `INSERT INTO document_version (
//         id, document_id, document_number, document_name,
//         file_name, file_path, file_type, file_size, checksum,
//         uploaded_by, change_reason, uploaded_at,
//         review_status
//       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
//       RETURNING *`,
//       [
//         versionId,
//         id,
//         nextNumber,
//         documentName, // Используем document_name из текущей версии
//         fileNameToSave,
//         fileUrl,
//         file.type,
//         file.size,
//         checksum,
//         uploadedBy,
//         changeReason || `Version ${nextNumber} upload`,
//         new Date().toISOString(),
//         null // review_status = null для новой версии
//       ]
//     );

//     // Сохраняем информацию о новой версии в ctx чтобы получить ее для аудита
//     // ctx.auditData = {
//     //   document_number: newVersion.document_number,
//     //   version_id: newVersion.id,
//     //   change_reason: newVersion.change_reason
//     // };

//     // Обновляем current_version_id в документе
//     await client.query(
//       `UPDATE document SET current_version_id = $1 WHERE id = $2`,
//       [versionId, id]
//     );

//     // Получаем обновленный документ
//     const { rows: [updatedDoc] } = await client.query(`
//       SELECT 
//         d.*,
//         lv.review_status,
//         lv.document_number,
//         lv.document_name,
//         lv.file_name,
//         lv.file_path,
//         lv.file_type,
//         lv.file_size,
//         lv.checksum,
//         lv.uploaded_at,
//         lv.change_reason,
//         CASE 
//           WHEN lv.review_status = 'approved' THEN 'approved'
//           WHEN lv.review_status = 'submitted' THEN 'in_review'
//           WHEN lv.review_status = 'rejected' THEN 'draft'
//           ELSE 'draft'
//         END as document_status
//       FROM document d
//       LEFT JOIN document_version lv ON d.current_version_id = lv.id
//       WHERE d.id = $1
//     `, [id]);
    

//     return NextResponse.json(
//       {
//         document: {
//           ...updatedDoc,
//           status: updatedDoc.document_status || 'draft'
//         },
//         version: newVersion,
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error('Error uploading version:', error);
//     return NextResponse.json(
//       {
//         error: 'Internal server error',
//         details: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }

// export const POST = withAudit(
//   {
//     action: 'UPDATE' as AuditAction,
//     entityType: 'document' as AuditEntity,


//     getEntityId: (ctx, req) => {
//       const parts = req.nextUrl.pathname.split('/');
//       return parts[parts.indexOf('documents') + 1] || '0';
//     },

//     getStudyId: (ctx) => {
//       return String(ctx.formData?.get('studyId') ?? '');
//     },

//     getSiteId: (ctx) => {
//       return String(ctx.formData?.get('siteId') ?? '');
//     },

//     // Мидлвар вызывает getOldValue ДО хендлера для получения состояния из БД.
//     getOldValue: async (ctx, req) => {
//       const parts = req.nextUrl.pathname.split('/');
//       const id = parts[parts.indexOf('documents') + 1];
//       const client = getPool();
//       try {
//         const { rows } = await client.query(
//         `SELECT 
//           dv.id,
//           dv.document_number,
//           dv.document_name,
//           dv.file_name,
//           dv.file_type,
//           dv.file_size,
//           dv.checksum,
//           dv.review_status,
//           dv.change_reason,
//           dv.uploaded_at,
//           dv.uploaded_by,
//           u.name as uploaded_by_name,
//           u.email as uploaded_by_email
//         FROM document_version dv 
//         JOIN document d ON d.current_version_id = dv.id 
//         LEFT JOIN users u ON dv.uploaded_by = u.id
//         WHERE d.id = $1`, 
//         [id]
//       );
//         return rows[0] || null;
//       } catch(error) {
//         console.error('Error getOldValue:', error);
//         return NextResponse.json(
//           {
//             error: 'getOldValue error',
//             details: error instanceof Error ? error.message : String(error),
//           },
//           { status: 500 }
//         );
//       }
//     },

//     // Мидлвар вызывает это ПОСЛЕ хендлера. Берем данные из того, что пришло в запросе
//     getNewValue: (ctx) => {
//       return {
//         //...ctx.auditData,
//         timestamp: new Date().toISOString()
//       };
//     }
//   },

//   uploadNewVersionHandler

// );

// Улучшенная версия

// app/api/documents/[id]/versions/route.ts

// app/api/documents/[id]/versions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import { getDocumentVersionS3Key } from "@/lib/s3-path";
import { uploadFileWithIAM } from "@/lib/s3-upload";
import { withAudit, AuditContext } from "@/lib/audit/audit.middleware";
import { AuditAction, AuditEntity } from "@/types/audit";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function getDocumentId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.indexOf("documents") + 1] || "0";
}

// Хелпер для форматирования пользователей в GET
function formatUser(id: string, name?: string, email?: string) {
  return name ? { id, name, email } : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pool = getPool();

  try {
    const { rows } = await pool.query(
      `SELECT 
        dv.*,
        uploader.name as uploader_name, uploader.email as uploader_email,
        reviewer.name as reviewer_name, reviewer.email as reviewer_email,
        approver.name as approver_name, approver.email as approver_email,
        assigned.name as assigned_name, assigned.email as assigned_email
      FROM document_version dv
      LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
      LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
      LEFT JOIN users approver ON dv.reviewed_by = approver.id
      LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
      WHERE dv.document_id = $1
      ORDER BY dv.document_number DESC`,
      [id]
    );

    const versions = rows.map((v) => ({
      ...v,
      uploader: formatUser(v.uploaded_by, v.uploader_name, v.uploader_email),
      reviewer: formatUser(v.review_submitted_by, v.reviewer_name, v.reviewer_email),
      approver: formatUser(v.reviewed_by, v.approver_name, v.approver_email),
      assigned_reviewer: formatUser(v.review_submitted_to, v.assigned_name, v.assigned_email),
    }));

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function uploadNewVersionHandler(
  request: NextRequest,
  ctx: AuditContext
) {
  const pool = getPool();
  const documentId = getDocumentId(request);
  
  // 🔹 Используем formData из контекста (уже прочитано в middleware)
  const formData = ctx.formData;

  try {
    if (!formData) throw new Error("Form data is missing");

    const file = formData.get("file") as File;
    const uploadedBy = formData.get("uploadedBy") as string;
    const changeReason = (formData.get("changeReason") as string) || undefined;
    const customFileName = formData.get("customFileName") as string | undefined;

    if (!file || !uploadedBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (Max 100MB)" }, { status: 400 });
    }

    // 🔹 Используем данные, которые loadEntity уже загрузил в ctx.entity
    const doc = ctx.entity;
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Вычисляем номер следующей версии (max_version мы получили в loadEntity)
    const nextVersion = (Number(doc.max_version) || 0) + 1;
    const versionId = uuidv4();
    const ext = file.name.split(".").pop() || "pdf";
    
    const s3Key = getDocumentVersionS3Key(
      doc.study_id,
      doc.folder_id,
      documentId,
      nextVersion,
      versionId,
      ext
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(buffer).digest("hex");
    let fileNameToSave = customFileName || file.name;
    if (customFileName && !customFileName.includes(".")) {
      fileNameToSave = `${customFileName}.${ext}`;
    }

    // Загрузка в S3
    await uploadFileWithIAM(
      process.env.YC_BUCKET_NAME!,
      s3Key,
      buffer,
      file.type,
      {
        documentid: documentId,
        versionid: versionId,
        studyid: String(doc.study_id),
        filename: fileNameToSave,
      }
    );

    const fileUrl = `https://storage.yandexcloud.net/${process.env.YC_BUCKET_NAME}/${s3Key}`;

    // 🔹 Сохраняем новую версию
    const { rows: [version] } = await pool.query(
      `INSERT INTO document_version (
        id, document_id, document_number, document_name,
        file_name, file_path, file_type, file_size, checksum,
        uploaded_by, change_reason, uploaded_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      RETURNING *`,
      [
        versionId,
        documentId,
        nextVersion,
        doc.document_name || file.name.replace(/\.[^/.]+$/, ""),
        fileNameToSave,
        fileUrl,
        file.type,
        file.size,
        checksum,
        uploadedBy,
        changeReason || `Version ${nextVersion} upload`,
      ]
    );

    // Обновляем ссылку на актуальную версию в основном документе
    await pool.query(
      `UPDATE document SET current_version_id = $1 WHERE id = $2`,
      [versionId, documentId]
    );

    return NextResponse.json({ version }, { status: 201 });

  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export const POST = withAudit(
  {
    action: "UPDATE" as AuditAction,
    entityType: "document" as AuditEntity,

    getEntityId: (_, req) => getDocumentId(req),

    // 🔹 Единая точка входа для загрузки данных из БД
    loadEntity: async (id) => {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT 
          d.*,
          lv.document_name,
          lv.file_name,
          lv.checksum,
          (SELECT COALESCE(MAX(document_number), 0) FROM document_version WHERE document_id = d.id) as max_version
        FROM document d
        LEFT JOIN document_version lv ON d.current_version_id = lv.id
        WHERE d.id = $1 AND d.is_deleted = false`,
        [id]
      );
      return rows[0] || null;
    },

    // Используем данные из ctx.entity, загруженные один раз
    getStudyId: (ctx) => String(ctx.entity?.study_id || ""),
    getSiteId: (ctx) => String(ctx.entity?.site_id || ""),
    getOldValue: (ctx) => ctx.entity,
    
    getNewValue: (ctx) => ({
      version_id: ctx.result?.version?.id,
      document_number: ctx.result?.version?.document_number,
      timestamp: new Date().toISOString(),
    }),
  },
  uploadNewVersionHandler
);