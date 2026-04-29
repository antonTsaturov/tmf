// app/api/documents/export/route.ts

/*
  Экспорт документов в архив.
*/

import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import archiver from "archiver";
import { PassThrough } from "stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import pLimit from "p-limit";
import crypto from "crypto";
import { buildFileNameWithMode, buildFolderMap, buildFolderPathWithMode, buildFullPathFromStructure } from "@/lib/cloud/s3-export";
import { buildAuditCsv } from "@/lib/audit/buildAuditCsv";
import { getAuditLogs } from "@/lib/audit/getAuditLogs";
import { logger } from "@/lib/utils/logger";
import { createCSVFile, CSVType } from "@/lib/cloud/s3-csv";

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
    `SELECT folders_structure, protocol, countries FROM study WHERE id = $1`,
    [studyId]
  );
  if (studyRows.length === 0) return new Response("Study not found", { status: 404 });

  const studyProtocol = studyRows[0].protocol;
  const studyCountries: string[] = studyRows[0].countries || [];
  const folderStructure = studyRows[0].folders_structure; // Сохраняем полную структуру
  const folderMap = buildFolderMap(studyRows[0].folders_structure);

  let query = "";
  const params = [studyId];

  // Получаем документы
  if (type === "full") {
    // 🔥 ВСЕ версии
    query = `
      SELECT
        d.study_id,
        d.site_id,
        d.country,
        s.name as site_name,
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
      LEFT JOIN site s ON d.site_id = s.id
      LEFT JOIN users u ON dv.uploaded_by = u.id

      WHERE d.study_id = $1

      ORDER BY d.site_id, d.folder_id, dv.document_number
    `;
  } else {
    // ✅ FINAL (только current)
    query = `
      SELECT
        d.study_id,
        d.site_id,
        d.country,
        s.name as site_name,
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
      LEFT JOIN site s ON d.site_id = s.id
      LEFT JOIN users u ON dv.uploaded_by = u.id

      WHERE d.study_id = $1
        AND d.is_deleted = FALSE
        AND d.current_version_id IS NOT NULL
        AND dv.review_status IN ('approved', 'archived')

      ORDER BY d.site_id, d.folder_id
    `;
  }

  const { rows: docs } = await pool.query(query, params);

  // 🔥 НОВОЕ: Для каждого документа вычисляем полный путь к папке на основе структуры
  const hasMultipleCountries = studyCountries.length > 1;
  
  const docsWithPaths = docs.map(doc => {
    // Строим полный путь к папке документа, используя структуру папок
    let fullFolderPath = "";
    
    if (doc.folder_id && folderStructure) {
      try {
        fullFolderPath = buildFullPathFromStructure(
          doc.folder_id,
          folderStructure,
          studyProtocol,
          doc.site_id,
          doc.site_name,
          doc.country,
          hasMultipleCountries
        );
      } catch (err) {
        logger.error(`Error building path for folder ${doc.folder_id}: ${err}`);
        // Fallback к простому имени папки
        fullFolderPath = folderMap.get(doc.folder_id) || "Unknown";
      }
    } else {
      fullFolderPath = folderMap.get(doc.folder_id) || "Unknown";
    }
    
    // Возвращаем документ с добавленным computedFolderPath
    return {
      ...doc,
      computedFolderPath: fullFolderPath,
      hasMultipleCountries,
      protocol: studyProtocol
    };
  });

  const stream = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(stream);

  const stats = {
    total: docsWithPaths.length,
    success: 0,
    checksumFailed: 0,
    failed: [] as string[]
  };

  // создаем metadata.csv
  const csv = createCSVFile(docsWithPaths, type as CSVType, folderMap);
  archive.append(csv, { name: `metadata.csv` });
  
  // Добавляем выгрузку аудит лога для full archive
  if (type === "full") {
    const auditRows = await getAuditLogs(studyId);
    const auditCsv = buildAuditCsv(auditRows);
    archive.append(auditCsv, { name: "audit/audit_log.csv" });
  }  

  // Загрузка и верификация
  await Promise.all(
    docsWithPaths.map(doc => limit(async () => {
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

        // 🔥 ИСПОЛЬЗУЕМ computedFolderPath для построения пути в архиве
        const folderPath = buildFolderPathWithMode(doc, type);
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