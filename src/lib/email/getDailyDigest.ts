// lib/notifications/getDailyDigest.ts

import { getPool } from '@/lib/db/index';

export async function getDailyDigest(userId: string, lastDigest: Date) {
  const client = getPool();
  // 1. Получаем все версии после lastDigest
  const versions = await client.query(`
    SELECT 
      dv.*,
      d.id as document_id,
      d.study_id,
      d.folder_name,
      d.created_at as document_created_at,
      u.name as uploader_name
    FROM document_version dv
    JOIN document d ON d.id = dv.document_id
    JOIN users u ON u.id = dv.uploaded_by
    WHERE dv.uploaded_at > $1
      AND d.is_deleted = false
  `, [lastDigest]);

  // 2. Архивированные документы
  const archivedDocs = await client.query(`
    SELECT 
      d.*,
      u.name as archived_by_name
    FROM document d
    LEFT JOIN users u ON u.id = d.archived_by
    WHERE d.archived_at > $1
  `, [lastDigest]);

  // 3. Группировка
  const newDocuments: any[] = [];
  const updatedDocuments: any[] = [];

  for (const v of versions.rows) {
    const isNewDoc =
      new Date(v.document_created_at).getTime() ===
      new Date(v.uploaded_at).getTime();

    if (isNewDoc) {
      newDocuments.push(v);
    } else {
      updatedDocuments.push(v);
    }
  }

  return {
    newDocuments,
    updatedDocuments,
    archivedDocuments: archivedDocs.rows,
  };
}