// app/api/documents/[id]/restore/route.ts
/* 
  Восстановление удалённого документа (только для ADMIN)
  Восстановленный документ автоматически получает статус draft
*/
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditContext } from '@/lib/audit/audit.middleware';
import { getDocumentById } from '@/lib/db/document';
import { AuditAction } from '@/types/audit';


// Handler for restoring document
export async function restoreHandler(
  request: NextRequest,
  ctx: AuditContext
) {
  const client = getPool();

  try {
    // Get document ID from URL
    const segments = request.nextUrl.pathname.split('/');
    const id = segments[segments.indexOf('documents') + 1];

    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { userId, reason } = ctx.body || {};

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Document already loaded via loadEntity in middleware
    const document = ctx.entity;

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (!document.is_deleted) {
      return NextResponse.json(
        { error: 'Document is not deleted' },
        { status: 400 }
      );
    }

    // Restore document
    const { rowCount, rows } = await client.query(`
      UPDATE document
      SET
        is_deleted = false,
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL,
        restored_at = NOW(),
        restored_by = $1,
        restoration_reason = $2
      WHERE id = $3 AND is_deleted = true
      RETURNING *
    `, [userId, reason, id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Failed to restore document' },
        { status: 500 }
      );
    }

    // Return result with audit data
    return NextResponse.json({
      success: true,
      document: rows[0],
    });

  } catch (error) {
    console.error('Error restoring document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

const getDocId = (req: NextRequest) => req.nextUrl.pathname.split('/').filter(Boolean)[2];

const action: AuditAction = 'RESTORE';

export const POST = withAudit(
  {
    action: action,
    entityType: 'document',

    getEntityId: (_, req) => getDocId(req),

    loadEntity: async (id) => {
      return getDocumentById(id);
    },

    getSiteId: (ctx) => ctx.entity?.site_id ?? 'General Level Document',

    getStudyId: (ctx) => ctx.entity?.study_id ?? '',

    getOldValue: (ctx) => ({
      is_deleted: ctx.entity?.is_deleted,
      deleted_at: ctx.entity?.deleted_at,
      deleted_by: ctx.entity?.deleted_by,
      deletion_reason: ctx.entity?.deletion_reason
    }),

    getNewValue: (ctx, req) => ({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      deletion_reason: null,
      restored_by: req.headers.get("x-user-id"),
      restored_at: new Date().toISOString(),
      restoration_reason: ctx.body.reason
    })    
  },
  restoreHandler
);

