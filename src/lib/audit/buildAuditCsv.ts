// lib/audit/buildAuditCsv.ts

function escapeCsv(value: any) {
  if (value === null || value === undefined) return "";

  const str =
    typeof value === "string"
      ? value
      : JSON.stringify(value);

  return `"${str.replace(/"/g, '""')}"`;
}

export function buildAuditCsv(rows: any[]) {
  let csv =
    "timestamp,action,entity_type,entity_id,user_email,user_role,status,reason,old_value,new_value,ip_address\n";

  for (const row of rows) {
    csv += [
      row.created_at?.toISOString(),
      row.action,
      row.entity_type,
      row.entity_id,
      row.user_email,
      escapeCsv(row.user_role),     // JSONB
      row.status,
      escapeCsv(row.reason),        // 🔥 важно
      escapeCsv(row.old_value),     // JSONB
      escapeCsv(row.new_value),     // JSONB
      row.ip_address,
    ].join(",") + "\n";
  }

  return csv;
}