// // app/api/documents/[id]/restore/route.ts
// // POST - восстановить удалённый документ (только для ADMIN)
// import { NextRequest, NextResponse } from 'next/server';
// import { connectDB } from '@/lib/db/index';
// import { AuthService } from '@/lib/auth/auth.service';
// import { withAudit } from '@/lib/audit/audit.middleware';
// import { AuditAction, AuditEntity } from '@/types/types';
// import { AuditConfig } from '@/lib/audit/audit.middleware';

// async function restoreHandler(
//   request: NextRequest,
//   id: string
// ): Promise<NextResponse> {
//   const client = await connectDB();

//   try {
//     const { rowCount, rows } = await client.query(`
//       UPDATE document 
//       SET 
//         is_deleted = false,
//         deleted_at = NULL,
//         deleted_by = NULL,
//         deletion_reason = NULL,
//         restored_at = NOW(),
//       WHERE id = $1 AND is_deleted = true
//       RETURNING *
//     `, [id]);

//     if (rowCount === 0) {
//       return NextResponse.json(
//         { error: 'Document not found or not deleted' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       message: 'Document restored successfully',
//       document: rows[0],
//     });
//   } catch (error) {
//     console.error('Error restoring document:', error);
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
//   } finally {
//     client.release();
//   }
// }

// export async function POST(
//   request: NextRequest,
//   ctx: { params: Promise<{ id: string }> }
// ) {
//   const authToken = request.cookies.get('auth-token')?.value;
//   const payload = authToken ? AuthService.verifyToken(authToken) : null;

//   if (!payload) {
//     return NextResponse.json(
//       { error: 'Forbidden. Admin access required.' },
//       { status: 403 }
//     );
//   }

//   const { id } = await ctx.params;

//   if (!id) {
//     return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
//   }

//   const auditConfig: AuditConfig = {
//     action: 'UPDATE' as AuditAction,
//     entityType: 'document' as AuditEntity,
//     getEntityId: () => 0,
//     getStudyId: () => 0,
//     getSiteId: () => '',
//     getNewValue: () => ({ restored: true, document_id: id }),
//     getOldValue: async () => null,
//   };

//   return withAudit(auditConfig)(request, async () => {
//     return restoreHandler(request, id);
//   });
// }
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

  // Получаем тело запроса (если есть)
  const body = await request.json().catch(() => ({}));

  const auditConfig: AuditConfig = {
    action: 'UPDATE' as AuditAction,
    entityType: 'document' as AuditEntity,
    
    // Получаем entity_id из URL
    getEntityId: (req: NextRequest) => {
      const urlParts = req.url.split('/');
      return parseInt(urlParts[urlParts.length - 2] || '0'); // [id] находится перед /restore
    },
    
    // Получаем study_id из ответа
    getStudyId: (req: NextRequest, body?: any) => {
      return body?.study_id || 0;
    },
    
    // Получаем site_id из ответа
    getSiteId: (req: NextRequest, body?: any) => {
      return body?.site_id || '';
    },
    
    // Получаем старое значение (до восстановления)
    getOldValue: async (req: NextRequest, body?: any) => {
      const client = await connectDB();
      try {
        const { rows } = await client.query(
          'SELECT * FROM document WHERE id = $1',
          [id]
        );
        return rows[0] || null;
      } catch (error) {
        console.error('Error fetching old value:', error);
        return null;
      } finally {
        client.release();
      }
    },
    
    // Получаем новое значение (после восстановления)
    getNewValue: (req: NextRequest, body?: any) => {
      return body?.document || null;
    },
    
    // Пропускаем аудит если нужно
    skip: (req: NextRequest) => {
      return false;
    }
  };

  // Оборачиваем обработчик в withAudit
  return withAudit(auditConfig)(
    request,
    async (preloadedData?: any) => {
      return restoreHandler(request, id, preloadedData);
    }
  );
}