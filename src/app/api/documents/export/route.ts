// // app/api/documents/export/route.ts

// import { NextRequest } from "next/server";
// import { getPool } from "@/lib/db";
// import archiver from "archiver";
// import { PassThrough } from "stream";
// import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
// import pLimit from "p-limit";
// import { buildFolderPath, buildFileName } from "@/lib/s3-export";

// const limit = pLimit(10);

// const s3 = new S3Client({
//   region: process.env.YC_REGION,
//   endpoint: process.env.YC_ENDPOINT,
//   credentials: {
//     accessKeyId: process.env.YC_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.YC_SECRET_ACCESS_KEY!,
//   },
// });


// export async function GET(req: NextRequest) {
//   const studyId = req.nextUrl.searchParams.get("id");

//   if (!studyId) {
//     return new Response("Missing study id", { status: 400 });
//   }

//   const pool = getPool();

//   const { rows: docs } = await pool.query(
//     `
//     SELECT 
//       d.study_id,
//       d.site_id,
//       d.tmf_zone,
//       d.tmf_artifact,
//       dv.document_name,
//       dv.document_number,
//       dv.file_name,
//       dv.file_path,
//       dv.checksum,
//       dv.uploaded_at,
//       u.email as uploaded_by
//     FROM document_version dv
//     JOIN document d ON d.id = dv.document_id
//     LEFT JOIN users u ON dv.uploaded_by = u.id
//     WHERE d.study_id = $1
//     ORDER BY d.site_id, d.folder_name, dv.document_number
//   `,
//     [studyId]
//   );

//   // создаем поток
//   const stream = new PassThrough();

//   const archive = archiver("zip", {
//     zlib: { level: 9 },
//   });

//   archive.pipe(stream);

//   // ===== metadata.csv =====
//   let csv = "document_name,version,site,folder,uploaded_by,date,checksum\n";

//   for (const doc of docs) {
//     csv += [
//       doc.document_name,
//       doc.document_number,
//       doc.site_id,
//       doc.folder_name,
//       doc.uploaded_by,
//       doc.uploaded_at,
//       doc.checksum,
//     ].join(",") + "\n";
//   }

//   archive.append(csv, { name: `Study_${studyId}/metadata.csv` });

//   // ===== файлы =====
//   await Promise.all(
//     docs.map(doc => limit(async () => {
//       try {
//         const key = doc.file_path.split(".net/")[1];

//         const s3Object = await s3.send(
//           new GetObjectCommand({
//             Bucket: process.env.YC_BUCKET_NAME!,
//             Key: key,
//           })
//         );

//         const folderPath = buildFolderPath(doc);
//         const fileName = buildFileName(doc);

//         archive.append(s3Object.Body as any, {
//           name: `${folderPath}/${fileName}`,
//         });

//       } catch (err) {
//         console.error("S3 error:", doc.file_path, err);
//       }
//     }))
//   );

//   await archive.finalize();

//   return new Response(stream as any, {
//     headers: {
//       "Content-Type": "application/zip",
//       "Content-Disposition": `attachment; filename="study_${studyId}.zip"`,
//     },
//   });
// }

// app/api/documents/export/route.ts

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

// Хелпер для превращения древовидной структуры папок в плоский справочник ID -> Name
function buildFolderMap(nodes: any[], map: Map<string, string> = new Map()) {
  for (const node of nodes) {
    map.set(node.id, node.name);
    if (node.children && node.children.length > 0) {
      buildFolderMap(node.children, map);
    }
  }
  return map;
}

export async function GET(req: NextRequest) {
  const studyId = req.nextUrl.searchParams.get("id");

  if (!studyId) {
    return new Response("Missing study id", { status: 400 });
  }

  const pool = getPool();

  // 1. Сначала получаем структуру папок из исследования
  const { rows: studyRows } = await pool.query(
    `SELECT folders_structure FROM study WHERE id = $1`,
    [studyId]
  );

  if (studyRows.length === 0) {
    return new Response("Study not found", { status: 404 });
  }

  const foldersStructure = studyRows[0].folders_structure || [];
  const folderMap = buildFolderMap(foldersStructure);

  // 2. Получаем документы (используем folder_id вместо folder_name)
  const { rows: docs } = await pool.query(
    `
    SELECT 
      d.study_id,
      d.site_id,
      d.tmf_zone,
      d.tmf_artifact,
      d.folder_id, -- берем ID для маппинга
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
    WHERE d.study_id = $1 AND d.is_deleted = FALSE
    ORDER BY d.site_id, d.folder_id, dv.document_number
  `,
    [studyId]
  );

  const stream = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(stream);

  // ===== metadata.csv =====
  let csv = "document_name,version,site,folder_name,uploaded_by,date,checksum\n";

  for (const doc of docs) {
    // Подставляем имя папки из нашего справочника по ID
    const resolvedFolderName = folderMap.get(doc.folder_id) || "Unknown_Folder";
    
    csv += [
      doc.document_name,
      doc.document_number,
      doc.site_id || "Core",
      resolvedFolderName,
      doc.uploaded_by,
      doc.uploaded_at?.toISOString(),
      doc.checksum,
    ].join(",") + "\n";
  }

  archive.append(csv, { name: `Study_${studyId}/metadata.csv` });

  // ===== файлы =====
  await Promise.all(
    docs.map(doc => limit(async () => {
      try {
        const key = doc.file_path.split(".net/")[1];
        if (!key) return;

        const s3Object = await s3.send(
          new GetObjectCommand({
            Bucket: process.env.YC_BUCKET_NAME!,
            Key: key,
          })
        );

        // Для корректной работы buildFolderPath, если она ожидает имя папки, 
        // подменяем или передаем вычисленное значение
        const resolvedFolderName = folderMap.get(doc.folder_id) || "Unknown_Folder";
        
        // Создаем модифицированный объект для хелперов путей
        const docWithResolvedFolder = { 
          ...doc, 
          folder_name: resolvedFolderName 
        };

        const folderPath = buildFolderPath(docWithResolvedFolder);
        const fileName = buildFileName(docWithResolvedFolder);

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