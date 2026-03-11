// app/api/documents/[id]/archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { AuditContext, withAudit } from '@/lib/audit/audit.middleware';
import { getDocumentForAudit } from '../delete/route';

async function archiveHandler(
  request: NextRequest,
  ctx: AuditContext,
): Promise<NextResponse> {
  const client = await connectDB();
  // Get doc ID
  const segments = request.nextUrl.pathname.split('/');
  const id = segments[segments.indexOf('documents') + 1];
  // Get user id
  const { userId } = ctx.body || {};

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    );
  }

  try {
    // Получаем информацию о документе до архивации
    const documentBefore = await client.query(
      `SELECT d.*, 
        dv.document_name, dv.file_name, dv.file_type, dv.file_size,
        s.title as study_title,
        sit.name as site_name
      FROM document d
      LEFT JOIN LATERAL (
        SELECT * FROM document_version 
        WHERE document_id = d.id 
        ORDER BY document_number DESC 
        LIMIT 1
      ) dv ON true
      LEFT JOIN study s ON d.study_id = s.id
      LEFT JOIN site sit ON d.site_id = sit.id
      WHERE d.id = $1`,
      [id]
    );

    if (documentBefore.rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documentBefore.rows[0];

    // Проверяем, не архивирован ли уже документ
    if (document.is_archived) {
      return NextResponse.json(
        { error: 'Document already archived' },
        { status: 400 }
      );
    }

    // Проверяем, не удален ли документ (нельзя архивировать удаленный документ)
    if (document.is_deleted) {
      return NextResponse.json(
        { error: 'Cannot archive deleted document' },
        { status: 400 }
      );
    }

    // Архивируем документ
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_archived = true,
        archived_at = NOW(),
        archived_by = $1
      WHERE id = $2 AND is_archived = false
      RETURNING *
    `, [userId, id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found or already archived' },
        { status: 404 }
      );
    }

    // Возвращаем результат с данными для аудита
    return NextResponse.json({
      message: 'Document archived successfully',
      document: rows[0],
      study_id: document.study_id,
      site_id: document.site_id,
      document_name: document.document_name || document.file_name,
      study_title: document.study_title,
      site_name: document.site_name,
      folder_name: document.folder_name
    });

  } catch (error) {
    console.error('Error archiving document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export const POST = withAudit(
  {
    action: 'ARCHIVE',
    entityType: 'document',

    getEntityId: (_, req) =>
      req.nextUrl.pathname.split('/').pop() || '',

    getStudyId: async (_, req) => {
      const id = String(req.nextUrl.pathname.split('/').pop());
      const doc = await getDocumentForAudit(id);
      return doc?.study_id ?? '';
    },

    getSiteId: async (_, req) => {
      const id = String(req.nextUrl.pathname.split('/').pop());
      const doc = await getDocumentForAudit(id);
      return String(doc?.site_id ?? '');
    },

    getOldValue: async (_, req) => {
      const id = req.nextUrl.pathname.split('/').pop();
      return getDocumentForAudit(String(id));
    },

    getNewValue: (ctx) => ({
      reason: ctx.body?.reason,
      deleted_by: ctx.body?.userId,
      is_deleted: true
    })
  },

  archiveHandler
);

