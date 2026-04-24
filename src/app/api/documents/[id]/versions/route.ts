// app/api/documents/[id]/versions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import { getDocumentVersionS3Key } from "@/lib/cloud/s3-path";
import { uploadFileWithIAM } from "@/lib/cloud/s3-upload";
import { withAudit, AuditContext } from "@/lib/audit/audit.middleware";
import { AuditAction, AuditEntity } from "@/types/audit";
import { logger } from "@/lib/utils/logger";

/*
* Загрузка новых версий документа
*/

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function getDocumentId(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/");
  return parts[parts.indexOf("documents") + 1] || "0";
}

// Хелпер для форматирования пользователей в GET
function formatUser(id: string, name?: string, email?: string) {
  return name ? { id, name, email } : null;
}

// Метод для получения списка версий в Document Details
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
    logger.error("Error fetching versions:", error);
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
    
    // 🔹 Используем транзакцию для атомарности и получения обновленных данных
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 🔹 INSERT новой версии
      const { rows: [version] } = await client.query(
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
          changeReason,
        ]
      );
      
      // 🔹 Обновляем ссылку на актуальную версию в основном документе
      await client.query(
        `UPDATE document SET current_version_id = $1 WHERE id = $2`,
        [versionId, documentId]
      );
         
      await client.query('COMMIT');
      
      // 🔹 Сохраняем результаты в контекст для аудита
      ctx.result = {
        version,
      };
      
      return NextResponse.json({ version }, { status: 201 });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error("Upload handler error:", error);
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
          lv.uploaded_at,
          lv.file_name,
          lv.checksum,
          lv.document_number as current_version_number,
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
    
    // 🔹 Старые значения (до изменений)
    getOldValue: (ctx) => ({
      version_number: ctx.entity.current_version_number,
      version_id: ctx.entity.current_version_id,
    }),    
    
    // 🔹 Новые значения (после изменений)
    getNewValue: (ctx) => ({
      version_number: ctx.result?.version.document_number,
      version_id: ctx.result?.version.id,
    }),    
  },
  uploadNewVersionHandler
);