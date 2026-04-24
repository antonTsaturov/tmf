// src/app/api/reports/audit/route.ts
import { AuditReportRequest } from '@/types/reports.type';
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


export async function POST(req: NextRequest) {
  try {
    const body: AuditReportRequest = await req.json();

    const {
      context = {},
      filters = {},
      pagination = {},
    } = body;

    const limit = Math.min(pagination.limit ?? 50, 500); // hard cap
    const offset = pagination.offset ?? 0;

    const values: any[] = [];
    const where: string[] = [];

    // ---- CONTEXT FILTERS ----
    // if (context.studyId) {
    //   values.push(context.studyId);
    //   where.push(`study_id = $${values.length}`);
    // }
    if (context.studyId) {
      values.push(String(context.studyId));
      where.push(`a.study_id::text = $${values.length}::text`);
    }


    if (context.siteId) {
      values.push(context.siteId);
      where.push(`site_id = $${values.length}`);
    }

    // ---- FILTERS ----
    if (filters.dateFrom) {
      values.push(filters.dateFrom);
      where.push(`created_at >= $${values.length}`);
    }

    if (filters.dateTo) {
      values.push(filters.dateTo);
      where.push(`created_at <= $${values.length}`);
    }

    if (filters.userId) {
      values.push(filters.userId);
      where.push(`user_id = $${values.length}`);
    }

    if (filters.action) {
      values.push(filters.action);
      where.push(`action = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      where.push(`status = $${values.length}`);
    }

    const whereClause =
      where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // ---- MAIN QUERY ----
    const query = `
      SELECT
        a.audit_id,
        a.created_at,
        a.user_id,
        a.user_email,
        a.user_role,
        u.name as user_name,
        a.action,
        a.entity_type,
        a.entity_id,
        dv.document_name as document_name,
        a.status,
        a.site_id,
        a.study_id,
        st.protocol as study_protocol,
        s.name as site_name,
        s.country as country,
        a.ip_address,
        a.session_id,
        a.error_message,
        a.reason,
        a.old_value,
        a.new_value
      FROM audit a
        LEFT JOIN site s ON a.site_id::text = s.id::text
        LEFT JOIN document d ON a.entity_id::uuid = d.id::uuid
        LEFT JOIN document_version dv 
          ON d.current_version_id::uuid = dv.id
        LEFT JOIN study st ON st.id = CAST(NULLIF(a.study_id, '') AS INTEGER)
        LEFT JOIN users u ON u.id::uuid = a.user_id::uuid
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    // ---- COUNT QUERY (for pagination) ----
    // const countQuery = `
    //   SELECT COUNT(*) as total
    //   FROM audit
    //   ${whereClause}
    // `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit a
        LEFT JOIN site s ON a.site_id::text = s.id::text
        LEFT JOIN document d ON a.entity_id::uuid = d.id::uuid
        LEFT JOIN document_version dv 
          ON d.current_version_id::uuid = dv.id
        LEFT JOIN study st ON st.id = CAST(NULLIF(a.study_id, '') AS INTEGER)
      ${whereClause}
    `;

    const client = await pool.connect();

    try {
      const [dataRes, countRes] = await Promise.all([
        client.query(query, values),
        client.query(countQuery, values.slice(0, values.length - 2)),
      ]);

      return NextResponse.json({
        data: dataRes.rows,
        meta: {
          total: Number(countRes.rows[0].total),
          limit,
          offset,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Audit report error:', error);

    return NextResponse.json(
      { error: 'Failed to generate audit report' },
      { status: 500 }
    );
  }
}

