// app/api/documents/[id]/archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { AuthService } from '@/lib/auth/auth.service';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

async function archiveHandler(
  request: NextRequest,
  id: string,
  userId: string
): Promise<NextResponse> {
  const client = await connectDB();

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

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authToken = request.cookies.get('auth-token')?.value;
  const payload = authToken ? AuthService.verifyToken(authToken) : null;

  if (!payload) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
  }

  const auditConfig: AuditConfig = {
    action: 'UPDATE' as AuditAction,
    entityType: 'document' as AuditEntity,
    
    getEntityId: (req: NextRequest) => {
      const urlParts = req.url.split('/');
      return parseInt(urlParts[urlParts.length - 2] || '0');
    },
    
    getStudyId: (req: NextRequest, body?: any) => {
      return body?.study_id || 0;
    },
    
    getSiteId: (req: NextRequest, body?: any) => {
      return body?.site_id || '';
    },
    
    // getUserId: (req: NextRequest, body?: any) => {
    //   return payload.userId;
    // },
    
    getOldValue: async (req: NextRequest, body?: any) => {
      const client = await connectDB();
      try {
        const { rows } = await client.query(
          `SELECT d.*, 
            dv.document_name, dv.file_name,
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
        return rows[0] || null;
      } catch (error) {
        console.error('Error fetching old value:', error);
        return null;
      } finally {
        client.release();
      }
    },
    
    getNewValue: (req: NextRequest, body?: any) => {
      return body?.document || null;
    },
    
    // getMetadata: (req: NextRequest, body?: any) => {
    //   return {
    //     archivedBy: payload.userId,
    //     archivedAt: new Date().toISOString(),
    //     documentName: body?.document_name,
    //     studyTitle: body?.study_title,
    //     siteName: body?.site_name,
    //     folderName: body?.folder_name,
    //     isArchived: true
    //   };
    // }
  };

  return withAudit(auditConfig)(
    request,
    async () => {
      return archiveHandler(request, id, String(payload.id));
    }
  );
}