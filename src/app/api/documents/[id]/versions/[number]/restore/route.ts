// app/api/documents/[id]/versions/[number]/restore/route.ts
// PUT - восстановить версию (сделать её текущей)
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

async function restoreVersionHandler(
  documentId: string,
  versionNumber: number,
  _request: NextRequest
) {
  const client = await connectDB();

  try {
    const { rows } = await client.query(
      `SELECT dv.id as version_id, d.study_id, d.site_id
       FROM document_version dv
       JOIN document d ON d.id = dv.document_id
       WHERE dv.document_id = $1 AND dv.document_number = $2`,
      [documentId, versionNumber]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const { version_id } = rows[0];

    const { rowCount } = await client.query(
      `UPDATE document
       SET current_version_id = $1, status = 'draft'
       WHERE id = $2 AND is_deleted = false`,
      [version_id, documentId]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found or deleted' },
        { status: 404 }
      );
    }

    const { rows: [doc] } = await client.query(
      'SELECT * FROM document WHERE id = $1',
      [documentId]
    );

    return NextResponse.json({
      message: 'Version restored successfully',
      document: doc,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export const PUT = async (
  request: NextRequest,
  ctx: { params: Promise<{ id: string; number: string }> }
) => {
  const { id, number } = await ctx.params;
  const versionNumber = parseInt(number, 10);

  if (isNaN(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
  }

  const auditConfig: AuditConfig = {
    action: 'UPDATE' as AuditAction,
    entityType: 'document' as AuditEntity,
    getEntityId: () => 0,
    getStudyId: () => 0,
    getSiteId: () => '',
    getNewValue: () => ({ restored_version: versionNumber }),
    getOldValue: async () => null,
  };

  return withAudit(auditConfig)(request, async () => {
    return restoreVersionHandler(id, versionNumber, request);
  });
};
