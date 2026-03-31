// app/api/documents/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { withAudit, AuditContext } from '@/lib/audit/audit.middleware';
import { getDocumentById } from '@/lib/db/document';
import { logger } from '@/lib/logger';

export async function softDeleteHandler(
  request: NextRequest,
  ctx: AuditContext,
) {
  const client = getPool();
  
  try {
    // 1. Используем уже загруженную сущность из контекста
    const document = ctx.entity;
    const { reason, userId } = ctx.body || {};

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.is_deleted) {
      return NextResponse.json({ error: 'Document already deleted' }, { status: 404 });
    }

    // Валидация входных данных
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Deletion reason is required and must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // 2. Выполняем только один UPDATE запрос
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = $1,
        deletion_reason = $2,
        restored_by = null,
        restored_at = null,
        restoration_reason = null
      WHERE id = $3 AND is_deleted = false
      RETURNING *
    `, [userId, reason.trim(), document.id]);

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Document already deleted' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Document soft deleted successfully',
      document: rows[0]
    });

  } catch (error) {
    logger.error('Error soft deleting document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const DELETE = withAudit(
  {
    action: 'DELETE',
    entityType: 'document',

    // Извлекаем ID из URL
    getEntityId: (_, req) => {
      const parts = req.nextUrl.pathname.split('/');
      return parts[parts.indexOf('documents') + 1] || '0';
    },

    //  Загружаем сущность один раз для всего жизненного цикла запроса
    loadEntity: async (_, ctx) => {
      const id = ctx.body.id;
      return await getDocumentById(id);
    },

    // Теперь эти функции просто берут данные из памяти (ctx.entity)
    getStudyId: (ctx) => ctx.entity?.study_id ?? '',
    getSiteId: (ctx) => String(ctx.entity?.site_id ?? 'General Level Document'),
    getOldValue: (ctx) => ({
      reason: ctx.entity.deletion_reason,
      deleted_by: ctx.entity?.deleted_by,
      is_deleted: ctx.entity?.is_deleted,
      deleted_at: ctx.entity?.deleted_at,
    }),

    getNewValue: (ctx) => ({
      reason: ctx.body?.reason,
      deleted_by: ctx.body?.userId,
      is_deleted: true,
      deleted_at: new Date().toISOString()
    })
  },
  softDeleteHandler
);