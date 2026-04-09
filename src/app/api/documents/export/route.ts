// app/api/documents/export/route.ts

import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import archiver from "archiver";
import { PassThrough } from "stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import pLimit from "p-limit";
import crypto from "crypto";
import { buildFileNameWithMode, buildFolderMap, buildFolderPathWithMode } from "@/lib/cloud/s3-export";
import { buildAuditCsv } from "@/lib/audit/buildAuditCsv";
import { getAuditLogs } from "@/lib/audit/getAuditLogs";
import { logger } from "@/lib/utils/logger";

const limit = pLimit(10);
const BUCKET_NAME = process.env.YC_BUCKET_NAME!;

const s3 = new S3Client({
  region: process.env.YC_REGION,
  endpoint: process.env.YC_ENDPOINT,
  credentials: {
    accessKeyId: process.env.YC_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YC_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {

  const type = req.nextUrl.searchParams.get("type") || "final";

  const studyId = req.nextUrl.searchParams.get("id");
  if (!studyId) return new Response("Missing study id", { status: 400 });

  const pool = getPool();
  
  // 1. Получаем структуру папок
  const { rows: studyRows } = await pool.query(
    `SELECT folders_structure, protocol FROM study WHERE id = $1`,
    [studyId]
  );
  if (studyRows.length === 0) return new Response("Study not found", { status: 404 });

  const studyProtocol = studyRows[0].protocol;
  const folderMap = buildFolderMap(studyRows[0].folders_structure);

  const query = "";
  const params = [studyId];

  // Получаем документы
  if (type === "full") {
    // 🔥 ВСЕ версии
    query = `
      SELECT 
        d.study_id,
        d.site_id,
        s.name as site_name, -- Добавляем имя сайта
        d.tmf_zone,
        d.tmf_artifact,
        d.folder_id,
        d.is_deleted,
        d.deleted_at,
        d.deletion_reason,

        dv.document_name,
        dv.document_number,
        dv.file_name,
        dv.file_path,
        dv.checksum,
        dv.uploaded_at,
        dv.review_status,

        u.email as uploaded_by

      FROM document_version dv
      JOIN document d ON d.id = dv.document_id
      LEFT JOIN site s ON d.site_id = s.id -- Джоиним таблицу сайтов
      LEFT JOIN users u ON dv.uploaded_by = u.id

      WHERE d.study_id = $1
        -- AND d.is_deleted = FALSE параметр выключен, получаем в том числе и удаленные документы

      ORDER BY d.site_id, d.folder_id, dv.document_number
    `;
  } else {
    // ✅ FINAL (только current)
    query = `
      SELECT 
        d.study_id,
        d.site_id,
        s.name as site_name, -- Добавляем имя сайта
        d.tmf_zone,
        d.tmf_artifact,
        d.folder_id,

        dv.document_name,
        dv.document_number,
        dv.file_name,
        dv.file_path,
        dv.checksum,
        dv.uploaded_at,
        dv.review_status,

        u.email as uploaded_by

      FROM document d
      JOIN document_version dv ON dv.id = d.current_version_id
      LEFT JOIN site s ON d.site_id = s.id -- Джоиним таблицу сайтов
      LEFT JOIN users u ON dv.uploaded_by = u.id

      WHERE d.study_id = $1
        AND d.is_deleted = FALSE
        AND d.current_version_id IS NOT NULL
        AND dv.review_status IN ('approved', 'archived')

      ORDER BY d.site_id, d.folder_id
    `;
  }

  const { rows: docs } = await pool.query(query, params);


  const stream = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(stream);

  const stats = {
    total: docs.length,
    success: 0,
    checksumFailed: 0,
    failed: [] as string[]
  };

    // создаем metadata.csv
  let csv = "document_name, version, status, level, site, folder_name, uploaded_by, date, checksum, deleted, deleted_at, deletion_reason\n";
  for (const doc of docs) {
    const folderName = folderMap.get(doc.folder_id) || "Unknown";
    csv += [
      doc.document_name, 
      doc.document_number, 
      doc.review_status, 
      doc.site_id ? "Site Level" : "General Level", // Уровень
      doc.site_id || "", 
      folderName, 
      doc.uploaded_by, 
      doc.uploaded_at?.toISOString(), 
      doc.checksum,
      doc.is_deleted,
      doc.deleted_at || '',
      doc.deleted_by || ''
    ].join(",") + "\n";
  }
  archive.append(csv, { name: `metadata.csv` });
  
  // Добавляем выгрузку аудит лога для full archive
  if (type === "full") {
    const auditRows = await getAuditLogs(studyId);
    const auditCsv = buildAuditCsv(auditRows);

    archive.append(auditCsv, { name: "audit/audit_log.csv" });
  }  

  // Загрузка и верификация
  await Promise.all(
    docs.map(doc => limit(async () => {
      try {
        const url = new URL(doc.file_path);
        const keyParts = url.pathname.replace(/^\//, '').split('/');
        if (keyParts[0] === BUCKET_NAME) keyParts.shift();
        const cleanKey = keyParts.join('/');

        const s3Response = await s3.send(new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: cleanKey,
        }));

        // Читаем поток в Buffer для вычисления хэша
        const chunks: Uint8Array[] = [];
        for await (const chunk of s3Response.Body as any) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);

        // Проверка контрольной суммы
        const calculatedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        if (doc.checksum && calculatedHash !== doc.checksum.toLowerCase()) {
          throw new Error(`Checksum mismatch! Expected: ${doc.checksum}, Got: ${calculatedHash}`);
        }

        const folderPath = buildFolderPathWithMode(
          { ...doc, 
            protocol: studyProtocol,
            folder_name: folderMap.get(doc.folder_id) },
          type
        );
        const fileName = buildFileNameWithMode(doc, type);


        archive.append(fileBuffer, { name: `${folderPath}/${fileName}` });
        stats.success++;

      } catch (err: any) {
        const isChecksumError = err.message.includes("Checksum mismatch");
        if (isChecksumError) stats.checksumFailed++;

        const errorMsg = `Error: ${doc.document_name} | File: ${doc.file_name} | Reason: ${err.message}`;
        logger.error(errorMsg);
        stats.failed.push(errorMsg);
      }
    }))
  );

  // Финальный отчет с результатами проверки
  const summary = [
    `Export Summary for Study ${studyId}`,
    `----------------------------------`,
    `Total records in DB: ${stats.total}`,
    `Successfully verified and added: ${stats.success}`,
    `Checksum verification failed: ${stats.checksumFailed}`,
    `Other S3/Network errors: ${stats.failed.length - stats.checksumFailed}`,
    stats.failed.length > 0 ? "\nDETAILED ERRORS:\n" + stats.failed.join("\n") : "\nAll files passed integrity check."
  ].join("\n");

  archive.append(summary, { name: "export_summary.txt" });

  await archive.finalize();

  const filename =
    type === "full"
      ? `study_${studyId}_full_export.zip`
      : `study_${studyId}_final_export.zip`;

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}