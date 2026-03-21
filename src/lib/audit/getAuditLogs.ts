// lib/audit/getAuditLogs.ts

import { getPool } from "@/lib/db";

export async function getAuditLogs(studyId: string) {
  const pool = getPool();

  const { rows } = await pool.query(
    `
    SELECT 
      created_at,
      action,
      entity_type,
      entity_id,
      user_id,
      user_email,
      user_role,
      status,
      reason,
      old_value,
      new_value,
      ip_address,
      user_agent,
      session_id
    FROM audit
    WHERE study_id = $1
      AND status = 'SUCCESS'
    ORDER BY created_at ASC
    `,
    [studyId] 
  );

  return rows;
}