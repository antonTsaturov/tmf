// app/api/export/route.ts

import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import archiver from "archiver";
import { PassThrough } from "stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import pLimit from "p-limit";
import { buildFolderPath, buildFileName } from "@/lib/s3-export";

const limit = pLimit(10);

const s3 = new S3Client({
  region: process.env.YC_REGION,
  endpoint: process.env.YC_ENDPOINT,
  credentials: {
    accessKeyId: process.env.YC_ACCESS_KEY_ID!,
    secretAccessKey: process.env.YC_SECRET_ACCESS_KEY!,
  },
});


export async function GET(req: NextRequest) {
  const studyId = req.nextUrl.searchParams.get("id");

  if (!studyId) {
    return new Response("Missing study id", { status: 400 });
  }

  const pool = getPool();

  const { rows: docs } = await pool.query(
    `
    SELECT 
      d.study_id,
      d.site_id,
      d.folder_name,
      d.tmf_zone,
      d.tmf_artifact,
      dv.document_name,
      dv.document_number,
      dv.file_name,
      dv.file_path,
      dv.checksum,
      dv.uploaded_at,
      u.email as uploaded_by
    FROM document_version dv
    JOIN document d ON d.id = dv.document_id
    LEFT JOIN users u ON dv.uploaded_by = u.id
    WHERE d.study_id = $1
    ORDER BY d.site_id, d.folder_name, dv.document_number
  `,
    [studyId]
  );

  // создаем поток
  const stream = new PassThrough();

  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  archive.pipe(stream);

  // ===== metadata.csv =====
  let csv = "document_name,version,site,folder,uploaded_by,date,checksum\n";

  for (const doc of docs) {
    csv += [
      doc.document_name,
      doc.document_number,
      doc.site_id,
      doc.folder_name,
      doc.uploaded_by,
      doc.uploaded_at,
      doc.checksum,
    ].join(",") + "\n";
  }

  archive.append(csv, { name: `Study_${studyId}/metadata.csv` });

  // ===== файлы =====
  await Promise.all(
    docs.map(doc => limit(async () => {
      try {
        const key = doc.file_path.split(".net/")[1];

        const s3Object = await s3.send(
          new GetObjectCommand({
            Bucket: process.env.YC_BUCKET_NAME!,
            Key: key,
          })
        );

        const folderPath = buildFolderPath(doc);
        const fileName = buildFileName(doc);

        archive.append(s3Object.Body as any, {
          name: `${folderPath}/${fileName}`,
        });

      } catch (err) {
        console.error("S3 error:", doc.file_path, err);
      }
    }))
  );

  await archive.finalize();

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="study_${studyId}.zip"`,
    },
  });
}