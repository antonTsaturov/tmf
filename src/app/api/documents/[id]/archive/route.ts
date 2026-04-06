// app/api/documents/[id]/archive/route.ts
/*
  Функция предназначена для архивации конкретного документа.
  Доступна для study_manager и admin
*/
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { withAudit, AuditContext } from '@/lib/audit/audit.middleware';
import { getDocumentById } from '@/lib/db/document';
import { logger } from '@/lib/utils/logger';

export async function archiveHandler(
  request: NextRequest,
  ctx: AuditContext,
) {
  const client = getPool();
  
  try {
    // 1. Используем уже загруженную сущность из контекста
    const document = ctx.entity;
    const { userId } = ctx.body || {};

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.is_archived) {
      return NextResponse.json({ error: 'Document already archived' }, { status: 400 });
    }

    if (document.is_deleted) {
      return NextResponse.json({ error: 'Cannot archive deleted document' }, { status: 400 });
    }

    // Валидация входных данных
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 2. Выполняем только один UPDATE запрос
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_archived = true,
        archived_at = NOW(),
        archived_by = $1
      WHERE id = $2 AND is_archived = false
      RETURNING *
    `, [userId, document.id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Document already archived' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Document archived successfully',
      document: rows[0]
    });

  } catch (error) {
    logger.error('Error archiving document:', error);
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

    getNewValue: (ctx) => ({
      archived_by: ctx.body?.userId,
      is_archived: true,
      archived_at: new Date().toISOString()
    })
  },
  archiveHandler
);
