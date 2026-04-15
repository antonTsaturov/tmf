// lib/notifications/getDailyDigest.ts

import { getPool } from '@/lib/db/index';

export async function getDailyDigest(userId: string, lastDigest: Date) {
  const client = getPool();

  // Получаем assigned_study_id пользователя
  const { rows: userRows } = await client.query(
    `SELECT assigned_study_id FROM users WHERE id = $1`,
    [userId]
  );
  const assignedStudyIds = userRows[0]?.assigned_study_id || [];

  if (assignedStudyIds.length === 0) {
    return { newDocuments: [], updatedDocuments: [], archivedDocuments: [] };
  }

  // 1. Получаем все версии после lastDigest только для доступных исследований
  const versions = await client.query(`
    SELECT
      dv.*,
      d.id as document_id,
      d.study_id,
      s.protocol as study_protocol,
      u.name as uploader_name
    FROM document_version dv
    JOIN document d ON d.id = dv.document_id
    JOIN studies s ON s.id = d.study_id
    JOIN users u ON u.id = dv.uploaded_by
    WHERE dv.uploaded_at > $1
      AND d.is_deleted = false
      AND d.study_id = ANY($2::integer[])
  `, [lastDigest, assignedStudyIds]);

  // 2. Архивированные документы только для доступных исследований
  const archivedDocs = await client.query(`
    SELECT
      d.*,
      u.name as archived_by_name
    FROM document d
    LEFT JOIN users u ON u.id = d.archived_by
    WHERE d.archived_at > $1
      AND d.study_id = ANY($2::integer[])
  `, [lastDigest, assignedStudyIds]);

  // 3. Группировка по версии документа
  const newDocuments: any[] = [];
  const updatedDocuments: any[] = [];

  for (const v of versions.rows) {
    // document_number === 1 — это первый документ (новый)
    // document_number > 1 — это новая версия существующего документа
    if (v.document_number === 1) {
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