// app/api/documents/[id]/unarchive/route.ts
// Разархивация одного архивированного документа. Admin use only
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { withAudit, AuditContext } from '@/lib/audit/audit.middleware';
import { getDocumentById } from '@/lib/db/document';

export async function unarchiveHandler(
  request: NextRequest,
  ctx: AuditContext,
) {
  const client = getPool();

  try {
    // 1. Используем уже загруженную сущность из контекста
    const document = ctx.entity;
    const { userId, unarchiveReason } = ctx.body || {};

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (!document.is_archived) {
      return NextResponse.json({ error: 'Document is not archived' }, { status: 400 });
    }

    if (document.is_deleted) {
      return NextResponse.json({ error: 'Cannot unarchive deleted document' }, { status: 400 });
    }

    // Валидация входных данных
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!unarchiveReason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    // 2. Получаем current_version_id и выполняем UPDATE запросы
    const { rows: docRows } = await client.query(`
      SELECT current_version_id FROM document WHERE id = $1
    `, [document.id]);

    if (docRows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const currentVersionId = docRows[0].current_version_id;

    // Обновляем документ
    const { rowCount, rows } = await client.query(`
      UPDATE document
      SET
        is_archived = false,
        archived_at = NULL,
        archived_by = NULL,
        unarchived_at = NOW(),
        unarchived_by = $2,
        unarchive_reason = $3
      WHERE id = $1 AND is_archived = true
      RETURNING *
    `, [document.id, userId, unarchiveReason]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Document is not unarchived' }, { status: 400 });
    }

    // Обновляем версию документа - сбрасываем review статусы в null (draft)
    if (currentVersionId) {
      await client.query(`
        UPDATE document_version
        SET
          review_status = NULL,
          review_submitted_to = NULL,
          review_submitted_by = NULL,
          review_submitted_at = NULL
        WHERE id = $1
      `, [currentVersionId]);
    }

    return NextResponse.json({
      message: 'Document unarchived successfully',
      document: rows[0]
    });

  } catch (error) {
    console.error('Error unarchiving document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAudit(
  {
    action: 'UPDATE',
    entityType: 'document',

    // Извлекаем ID из URL
    getEntityId: (_, req) => {
      const parts = req.nextUrl.pathname.split('/');
      return parts[parts.indexOf('documents') + 1] || '0';
    },

    //  Загружаем сущность один раз для всего жизненного цикла запроса
    loadEntity: async (_, ctx) => {
      const {docId} = ctx.body;
      return await getDocumentById(docId);
    },

    // Теперь эти функции просто берут данные из памяти (ctx.entity)
    getStudyId: (ctx) => ctx.entity?.study_id ?? '',
    getSiteId: (ctx) => String(ctx.entity?.site_id ?? 'General Level Document'),
    getOldValue: (ctx) => ({
      archived_by: ctx.entity?.archived_by,
      is_archived: ctx.entity?.is_archived,
      archived_at: ctx.entity?.archived_at,
    }),

    getNewValue: (ctx, req) => ({
      archived_by: null,
      is_archived: false,
      archived_at: null,
      unarchived_at: new Date().toISOString(),
      unarchived_by: req.headers.get("x-user-id"),
      unarchive_reason: ctx.body.unarchiveReason
    })
  },
  unarchiveHandler
);
