// app/api/documents/[id]/restore/route.ts
// Восстановление удалённого документа (только для ADMIN)
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth.service';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

async function restoreHandler(
  request: NextRequest,
  id: string,
  userId?: string,
  preloadedData?: any
): Promise<NextResponse> {
  const client = await connectDB();

  try {
    // Получаем информацию о документе до восстановления для аудита
    const documentBefore = await client.query(
      'SELECT * FROM document WHERE id = $1',
      [id]
    );

    if (documentBefore.rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (!documentBefore.rows[0].is_deleted) {
      return NextResponse.json(
        { error: 'Document is not deleted' },
        { status: 404 }
      );
    }

    // Восстанавливаем документ
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_deleted = false,
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL,
        restored_at = NOW(),
        restored_by = $1
      WHERE id = $2 AND is_deleted = true
      RETURNING *
    `, [userId, id]);

    if (rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found or not deleted' },
        { status: 404 }
      );
    }

    // Возвращаем результат с данными для аудита
    return NextResponse.json({
      message: 'Document restored successfully',
      document: rows[0],
      // Данные для аудита будут извлечены через AuditConfig
      study_id: rows[0].study_id,
      site_id: rows[0].site_id
    });

  } catch (error) {
    console.error('Error restoring document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

