// src/app/api/reports/audit/pdf/route.ts

import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { AuditReportRequest } from '@/types/reports.type';
import { renderAuditPdf } from '@/lib/pdf/renderAuditPdf';

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

    const limit = Math.min(pagination.limit ?? 50, 500);
    const offset = pagination.offset ?? 0;

    const values: any[] = [];
    const where: string[] = [];

    // -------------------------
    // CONTEXT (study / center)
    // -------------------------
    if (context.studyId) {
      values.push(String(context.studyId));
      where.push(`a.study_id::text = $${values.length}::text`);
    }

    if (context.siteId) {
      values.push(String(context.siteId));
      where.push(`a.site_id = $${values.length}`);
    }

    // -------------------------
    // FILTERS
    // -------------------------
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
      where.push(`user_id = $${values.length}::text`);
    }

    if (filters.action) {
      values.push(filters.action);
      where.push(`action = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      where.push(`status = $${values.length}`);
    }

    // -------------------------
    // NEW: COUNTRY FILTER
    // -------------------------
    if (filters.country) {
      values.push(filters.country);
      where.push(`s.country::text = $${values.length}::text`);
    }

    const whereClause =
      where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // -------------------------
    // DATA QUERY
    // -------------------------
    const query = `
      SELECT
        a.audit_id,
        a.created_at,
        a.user_id,
        a.user_email,
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
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    values.push(limit, offset);

    // -------------------------
    // COUNT QUERY
    // -------------------------
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

    console.log('Query:', query);
    console.log('Values:', values);
    
    try {
      const [dataRes, countRes] = await Promise.all([
        client.query(query, values),
        client.query(countQuery, values.slice(0, values.length - 2)),
      ]);

      const logs = dataRes.rows;

      const paginationResult = {
        total: Number(countRes.rows[0].total),
        limit,
        offset,
      };

      const generatedAt = new Date().toISOString();

      // -------------------------
      // PDF GENERATION
      // -------------------------
      const buffer = await renderAuditPdf({
        logs,
        filters,
        pagination: paginationResult,
        generatedAt,
      });

      //const webStream = nodeToWeb(nodeStream);


      return new Response(buffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="audit-report.pdf"`,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Audit report error:', error);

    return new Response(
      JSON.stringify({ error: 'Failed to generate audit report' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}