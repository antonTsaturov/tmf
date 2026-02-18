// app/api/documents/[id]/restore/route.ts
// POST - восстановить удалённый документ (только для ADMIN)
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth.service';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

async function restoreHandler(
  request: NextRequest,
  id: string
): Promise<NextResponse> {
  const client = await connectDB();

  try {
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_deleted = false,
        status = 'draft',
        deleted_at = NULL
      WHERE id = $1 AND is_deleted = true
      RETURNING *
    `, [id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found or not deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Document restored successfully',
      document: rows[0],
    });
  } catch (error) {
    console.error('Error restoring document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authToken = request.cookies.get('auth-token')?.value;
  const payload = authToken ? AuthService.verifyToken(authToken) : null;

  if (!payload) {
    return NextResponse.json(
      { error: 'Forbidden. Admin access required.' },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  const auditConfig: AuditConfig = {
    action: 'UPDATE' as AuditAction,
    entityType: 'document' as AuditEntity,
    getEntityId: () => 0,
    getStudyId: () => 0,
    getSiteId: () => '',
    getNewValue: () => ({ restored: true, document_id: id }),
    getOldValue: async () => null,
  };

  return withAudit(auditConfig)(request, async () => {
    return restoreHandler(request, id);
  });
}
