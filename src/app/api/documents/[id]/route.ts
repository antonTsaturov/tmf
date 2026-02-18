// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

// Функция для получения документа (синхронная, если данные уже получены)
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
async function softDeleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await connectDB();
  
  try {
    // ⚠️ ВАЖНО: Await params before accessing its properties
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Сначала получаем документ для аудита
    const document = await getDocumentForAudit(id);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Мягкое удаление
    const { rowCount, rows } = await client.query(`
      UPDATE document 
      SET 
        is_deleted = true,
        status = 'deleted',
        deleted_at = NOW()
      WHERE id = $1 AND is_deleted = false
      RETURNING *
    `, [id]);

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
          status: 'deleted',
          deleted_at: new Date().toISOString()
        },
        studyId: document.study_id,
        siteId: document.site_id
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

// Функция для восстановления документа
async function restoreHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await connectDB();
  
  try {
    // ⚠️ ВАЖНО: Await params before accessing its properties
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Восстанавливаем документ
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
      document: rows[0]
    });

  } catch (error) {
    console.error('Error restoring document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - мягкое удаление с аудитом
export const DELETE = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auditConfig: AuditConfig = {
    action: 'DELETE' as AuditAction,
    entityType: 'DOCUMENT' as AuditEntity,
    
    getEntityId: (req: NextRequest) => {
      return 0; // ID документа будет передан через body
    },
    
    getStudyId: (req: NextRequest, body?: any) => {
      return body?._auditData?.studyId || 0;
    },
    
    getSiteId: (req: NextRequest, body?: any) => {
      return body?._auditData?.siteId || '';
    },
    
    getOldValue: (req: NextRequest, body?: any) => {
      return body?._auditData?.oldValue || null;
    },
    
    getNewValue: (req: NextRequest, body?: any) => {
      return body?._auditData?.newValue || null;
    }
  };

  return withAudit(auditConfig)(request, async (preloadedData?: any) => {
    const response = await softDeleteHandler(request, { params });
    return response;
  });
};

// POST для восстановления документа
export const POST = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  // Проверяем, это запрос на восстановление?
  const url = new URL(request.url);
  const isRestore = url.searchParams.get('action') === 'restore';
  
  if (isRestore) {
    const auditConfig: AuditConfig = {
      action: 'UPDATE' as AuditAction,
      entityType: 'DOCUMENT' as AuditEntity,
      
      getEntityId: (req: NextRequest) => {
        return 0;
      },
      
      getStudyId: (req: NextRequest, body?: any) => {
        return body?.study_id || 0;
      },
      
      getSiteId: (req: NextRequest, body?: any) => {
        return body?.site_id || '';
      },
      
      getOldValue: async (req: NextRequest) => {
        // Для восстановления нужно будет получить данные документа
        return null;
      },
      
      getNewValue: (req: NextRequest) => {
        return {
          is_deleted: false,
          status: 'draft',
          deleted_at: null
        };
      }
    };

    return withAudit(auditConfig)(request, async () => {
      const response = await restoreHandler(request, { params });
      return response;
    });
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};