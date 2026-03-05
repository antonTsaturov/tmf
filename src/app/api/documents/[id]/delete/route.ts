// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditContext } from '@/lib/audit/audit.middleware';

// Функция для получения документа для аудита
async function getDocumentForAudit(documentId: string) {
  const client = await connectDB();
  try {
    const { rows } = await client.query(
      'SELECT * FROM document WHERE id = $1',
      [documentId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching document for audit:', error);
    return null;
  } finally {
    client.release();
  }
}

// Функция для мягкого удаления документа
async function softDeleteHandler(
  request: NextRequest,
  ctx: AuditContext,
  
) {
  const client = await connectDB();
  
  try {
    // Получаем ID документа 
    const segments = request.nextUrl.pathname.split('/');
    const id = segments[segments.indexOf('documents') + 1];

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { reason, userId } = ctx.body || {};

    // Валидация обязательных полей
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Валидация причины удаления
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Deletion reason is required and must be at least 10 characters long' },
        { status: 400 }
      );
    }

    // Сначала получаем документ для аудита (до изменений)
    const document = await getDocumentForAudit(id);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Проверяем, не удален ли уже документ
    if (document.is_deleted) {
      return NextResponse.json(
        { error: 'Document already deleted' },
        { status: 404 }
      );
    }

    // Мягкое удаление - обновляем только таблицу document
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = $1,
        deletion_reason = $2
      WHERE id = $3 AND is_deleted = false
      RETURNING *
    `, [userId, reason.trim(), id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Document already deleted' },
        { status: 404 }
      );
    }

    // Возвращаем результат вместе с данными документа для аудита
    return NextResponse.json({ 
      message: 'Document soft deleted successfully',
      document: rows[0],
      _auditData: {
        oldValue: document,
        newValue: {
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          deletion_reason: reason.trim()
        },
        studyId: document.study_id,
        siteId: document.site_id,
        userId: userId,
        deletionReason: reason.trim()
      }
    });

  } catch (error) {
    console.error('Error soft deleting document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const DELETE = withAudit(
  {
    action: 'DELETE',
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

  softDeleteHandler
);
