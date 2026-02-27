// // app/api/documents/[id]/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { connectDB } from '@/lib/db/index';
// import { withAudit } from '@/lib/audit/audit.middleware';
// import { AuditAction, AuditEntity } from '@/types/types';
// import { AuditConfig } from '@/lib/audit/audit.middleware';

// // Функция для получения документа (синхронная, если данные уже получены)
// async function getDocumentForAudit(documentId: string) {
//   const client = await connectDB();
//   try {
//     const { rows } = await client.query(
//       'SELECT * FROM document WHERE id = $1',
//       [documentId]
//     );
//     return rows[0] || null;
//   } catch (error) {
//     console.error('Error fetching document for audit:', error);
//     return null;
//   } finally {
//     client.release();
//   }
// }

// // Функция для мягкого удаления документа
// async function softDeleteHandler(request: NextRequest, { params }: { params: Promise<{ docId: string, userId: string, reason: string }> }) {
//   const client = await connectDB();
  
//   try {
//     // ⚠️ ВАЖНО: Await params before accessing its properties
//     const { docId, userId, reason } = await params;
    
//     if (!docId) {
//       return NextResponse.json(
//         { error: 'Document ID is required' },
//         { status: 400 }
//       );
//     }

//     // Сначала получаем документ для аудита
//     const document = await getDocumentForAudit(docId);
    
//     if (!document) {
//       return NextResponse.json(
//         { error: 'Document not found' },
//         { status: 404 }
//       );
//     }

//     // Мягкое удаление
//     const { rowCount, rows } = await client.query(`
//       UPDATE document 
//       SET 
//         is_deleted = true,
//         deleted_at = NOW(),
//         deleted_by = $1,
//         deletion_reason = $2
//       WHERE id = $3 AND is_deleted = false
//       RETURNING *
//     `, [userId, reason, docId]);

//     if (rowCount === 0) {
//       return NextResponse.json(
//         { error: 'Document already deleted' },
//         { status: 404 }
//       );
//     }

//     // Возвращаем результат вместе с данными документа для аудита
//     return NextResponse.json({ 
//       message: 'Document soft deleted successfully',
//       document: rows[0],
//       _auditData: {
//         oldValue: document,
//         newValue: {
//           is_deleted: true,
//           deletion_reason: reason,
//           deleted_at: new Date().toISOString(),
//           deleted_by: userId
//         },
//         studyId: document.study_id,
//         siteId: document.site_id
//       }
//     });

//   } catch (error) {
//     console.error('Error soft deleting document:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   } finally {
//     client.release();
//   }
// }

// // Функция для восстановления документа
// async function restoreHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   const client = await connectDB();
  
//   try {
//     // ⚠️ ВАЖНО: Await params before accessing its properties
//     const { id } = await params;
    
//     if (!id) {
//       return NextResponse.json(
//         { error: 'Document ID is required' },
//         { status: 400 }
//       );
//     }

//     // Восстанавливаем документ
//     const { rowCount, rows } = await client.query(`
//       UPDATE document 
//       SET 
//         is_deleted = false,
//         status = 'draft',
//         deleted_at = NULL
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
//       document: rows[0]
//     });

//   } catch (error) {
//     console.error('Error restoring document:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   } finally {
//     client.release();
//   }
// }

// // DELETE - мягкое удаление с аудитом
// export const DELETE = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
//   const auditConfig: AuditConfig = {
//     action: 'DELETE' as AuditAction,
//     entityType: 'DOCUMENT' as AuditEntity,
    
//     getEntityId: (req: NextRequest) => {
//       return 0; // ID документа будет передан через body
//     },
    
//     getStudyId: (req: NextRequest, body?: any) => {
//       return body?._auditData?.studyId || 0;
//     },
    
//     getSiteId: (req: NextRequest, body?: any) => {
//       return body?._auditData?.siteId || '';
//     },
    
//     getOldValue: (req: NextRequest, body?: any) => {
//       return body?._auditData?.oldValue || null;
//     },
    
//     getNewValue: (req: NextRequest, body?: any) => {
//       return body?._auditData?.newValue || null;
//     }
//   };

//   return withAudit(auditConfig)(request, async (preloadedData?: any) => {
//     const response = await softDeleteHandler(request, { params });
//     return response;
//   });
// };

// // POST для восстановления документа
// export const POST = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
//   // Проверяем, это запрос на восстановление?
//   const url = new URL(request.url);
//   const isRestore = url.searchParams.get('action') === 'restore';
  
//   if (isRestore) {
//     const auditConfig: AuditConfig = {
//       action: 'UPDATE' as AuditAction,
//       entityType: 'DOCUMENT' as AuditEntity,
      
//       getEntityId: (req: NextRequest) => {
//         return 0;
//       },
      
//       getStudyId: (req: NextRequest, body?: any) => {
//         return body?.study_id || 0;
//       },
      
//       getSiteId: (req: NextRequest, body?: any) => {
//         return body?.site_id || '';
//       },
      
//       getOldValue: async (req: NextRequest) => {
//         // Для восстановления нужно будет получить данные документа
//         return null;
//       },
      
//       getNewValue: (req: NextRequest) => {
//         return {
//           is_deleted: false,
//           status: 'draft',
//           deleted_at: null
//         };
//       }
//     };

//     return withAudit(auditConfig)(request, async () => {
//       const response = await restoreHandler(request, { params });
//       return response;
//     });
//   }

//   return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
// };

// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

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
async function softDeleteHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await connectDB();
  
  try {
    // Получаем ID документа из params
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Получаем тело запроса с причиной удаления и ID пользователя
    const body = await request.json().catch(() => ({}));
    const { reason, userId } = body;

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

// Функция для восстановления документа
// async function restoreHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   const client = await connectDB();
  
//   try {
//     const { id } = await params;
    
//     if (!id) {
//       return NextResponse.json(
//         { error: 'Document ID is required' },
//         { status: 400 }
//       );
//     }

//     // Получаем тело запроса с ID пользователя
//     const body = await request.json().catch(() => ({}));
//     const { userId } = body;

//     // Валидация обязательных полей
//     if (!userId) {
//       return NextResponse.json(
//         { error: 'User ID is required' },
//         { status: 400 }
//       );
//     }

//     // Получаем документ для аудита (до изменений)
//     const document = await getDocumentForAudit(id);

//     if (!document) {
//       return NextResponse.json(
//         { error: 'Document not found' },
//         { status: 404 }
//       );
//     }

//     // Проверяем, удален ли документ
//     if (!document.is_deleted) {
//       return NextResponse.json(
//         { error: 'Document is not deleted' },
//         { status: 404 }
//       );
//     }

//     // Восстанавливаем документ
//     const { rowCount, rows } = await client.query(`
//       UPDATE document 
//       SET 
//         is_deleted = false,
//         deleted_at = NULL,
//         deleted_by = NULL,
//         deletion_reason = NULL,
//         restored_at = NOW(),
//         restored_by = $1
//       WHERE id = $2 AND is_deleted = true
//       RETURNING *
//     `, [userId, id]);

//     if (rowCount === 0) {
//       return NextResponse.json(
//         { error: 'Document not found or not deleted' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({ 
//       message: 'Document restored successfully',
//       document: rows[0],
//       _auditData: {
//         oldValue: document,
//         newValue: rows[0],
//         studyId: document.study_id,
//         siteId: document.site_id,
//         userId: userId
//       }
//     });

//   } catch (error) {
//     console.error('Error restoring document:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   } finally {
//     client.release();
//   }
// }

// DELETE - мягкое удаление с аудитом
export const DELETE = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auditConfig: AuditConfig = {
    action: 'DELETE' as AuditAction,
    entityType: 'DOCUMENT' as AuditEntity,
    
    getEntityId: (req: NextRequest) => {
      const urlParts = req.url.split('/');
      return parseInt(urlParts[urlParts.length - 1] || '0');
    },
    
    getStudyId: (req: NextRequest, body?: any) => {
      return body?._auditData?.studyId || 0;
    },
    
    getSiteId: (req: NextRequest, body?: any) => {
      return body?._auditData?.siteId || '';
    },
    
    // getUserId: (req: NextRequest, body?: any) => {
    //   return body?._auditData?.userId || 0;
    // },
    
    getOldValue: (req: NextRequest, body?: any) => {
      return body?._auditData?.oldValue || null;
    },
    
    getNewValue: (req: NextRequest, body?: any) => {
      return body?._auditData?.newValue || null;
    },
    
    // getMetadata: (req: NextRequest, body?: any) => {
    //   return {
    //     deletionReason: body?._auditData?.deletionReason,
    //     deletedBy: body?._auditData?.userId
    //   };
    // }
  };

  return withAudit(auditConfig)(request, async (preloadedData?: any) => {
    const response = await softDeleteHandler(request, { params });
    return response;
  });
};

// POST для восстановления документа
// export const POST = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
//   // Проверяем, это запрос на восстановление?
//   const url = new URL(request.url);
//   const isRestore = url.searchParams.get('action') === 'restore';
  
//   if (isRestore) {
//     const auditConfig: AuditConfig = {
//       action: 'UPDATE' as AuditAction,
//       entityType: 'DOCUMENT' as AuditEntity,
      
//       getEntityId: (req: NextRequest) => {
//         const urlParts = req.url.split('/');
//         return parseInt(urlParts[urlParts.length - 1] || '0');
//       },
      
//       getStudyId: (req: NextRequest, body?: any) => {
//         return body?._auditData?.studyId || 0;
//       },
      
//       getSiteId: (req: NextRequest, body?: any) => {
//         return body?._auditData?.siteId || '';
//       },
      
//       // getUserId: (req: NextRequest, body?: any) => {
//       //   return body?._auditData?.userId || 0;
//       // },
      
//       getOldValue: (req: NextRequest, body?: any) => {
//         return body?._auditData?.oldValue || null;
//       },
      
//       getNewValue: (req: NextRequest, body?: any) => {
//         return body?._auditData?.newValue || null;
//       },
      
//       // getMetadata: (req: NextRequest, body?: any) => {
//       //   return {
//       //     restoredBy: body?._auditData?.userId,
//       //     restoredAt: new Date().toISOString()
//       //   };
//       // }
//     };

//     return withAudit(auditConfig)(request, async () => {
//       const response = await restoreHandler(request, { params });
//       return response;
//     });
//   }

//   return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
// };