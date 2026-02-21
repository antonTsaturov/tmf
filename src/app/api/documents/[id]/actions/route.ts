// app/api/documents/[id]/actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { DocumentAction, DocumentStatus, Transitions } from '@/types/document';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { UserRole } from '@/types/types';
import { withAudit } from '@/lib/audit/audit.middleware';
import { AuditAction, AuditEntity } from '@/types/types';
import { AuditConfig } from '@/lib/audit/audit.middleware';

interface ActionRequest {
  action: DocumentAction;
  userId: string;
  userRole: UserRole;
  comment?: string;
  reviewerId: string;
}

async function applyDocumentActionHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await connectDB();
  
  try {
    // Парсим тело запроса
    const body: ActionRequest = await request.json();
    const { action, userId, userRole, comment, reviewerId } = body;

    if (!action || !userId || !userRole) {
      return NextResponse.json(
        { error: 'Missing required fields: action, userId, userRole' },
        { status: 400 }
      );
    }

    // 1. Получаем текущую версию документа
    const { rows: documents } = await client.query(`
      SELECT d.*, dv.document_number, dv.document_name, dv.file_name, dv.file_path,
             dv.file_type, dv.file_size, dv.checksum, dv.uploaded_by, dv.uploaded_at
      FROM document d
      LEFT JOIN document_version dv ON d.current_version_id = dv.id
      WHERE d.id = $1 AND d.is_deleted = false
    `, [id]);

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documents[0];
    const currentStatus = document.status as DocumentStatus;

    // 2. Проверяем разрешён ли переход для данного статуса
    const allowedActions = Transitions[currentStatus] || [];
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { 
          error: 'Action not allowed for current document status',
          currentStatus,
          allowedActions 
        },
        { status: 403 }
      );
    }

    // 3. Проверяем права пользователя на выполнение действия
    const allowedRoles = ActionRoleMap[action] || [];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { 
          error: 'User role not authorized to perform this action',
          requiredRoles: allowedRoles 
        },
        { status: 403 }
      );
    }

    // Определяем новый статус на основе действия
    let newStatus: DocumentStatus;
    switch (action) {
      case DocumentAction.SUBMIT_FOR_REVIEW:
        newStatus = DocumentStatus.IN_REVIEW;
        break;
      case DocumentAction.APPROVE:
        newStatus = DocumentStatus.APPROVED;
        break;
      case DocumentAction.REJECT:
        newStatus = DocumentStatus.DRAFT; // или другой статус по вашему выбору
        break;
      case DocumentAction.ARCHIVE:
        newStatus = DocumentStatus.ARCHIVED;
        break;
      case DocumentAction.UNARCHIVE:
        newStatus = DocumentStatus.DRAFT;
        break;
      case DocumentAction.SOFT_DELETE:
        newStatus = DocumentStatus.DELETED;
        break;
      case DocumentAction.RESTORE:
        newStatus = DocumentStatus.DRAFT;
        break;
      default:
        // Для действий, не меняющих статус (VIEW, DOWNLOAD, UPLOAD_NEW_VERSION)
        newStatus = currentStatus;
    }

    // 4. Обновляем статус документа
    let updateQuery = `
      UPDATE document 
      SET status = $2
    `;
    const queryParams: any[] = [id, newStatus];

    // Если документ удаляется, обновляем deleted_at и deleted_by
    if (action === DocumentAction.SOFT_DELETE) {
      updateQuery += `, deleted_at = NOW(), deleted_by = $3`;
      queryParams.push(userId);
    }
    
    // Если документ восстанавливается, сбрасываем deleted_at
    if (action === DocumentAction.RESTORE) {
      updateQuery += `, deleted_at = NULL, deleted_by = NULL, restored_at = NOW(), restored_by = $3`;
      queryParams.push(userId);
    }

    updateQuery += ` WHERE id = $1 RETURNING *`;

    const { rows: updatedDocs } = await client.query(updateQuery, queryParams);
    const updatedDocument = updatedDocs[0];

    // Если статус изменился, записываем в document_version (опционально)
    // if (newStatus !== currentStatus && 
    //     [DocumentAction.SUBMIT_FOR_REVIEW, DocumentAction.APPROVE, DocumentAction.REJECT].includes(action)) {
      
    //   await client.query(`
    //     UPDATE document_version 
    //     SET 
    //       review_status = $2,
    //       review_submitted_at = NOW(),
    //       reviewed_by = $3,
    //       reviewed_at = NOW(),
    //       review_comment = $4
    //     WHERE id = $5
    //   `, [
    //     document.id,
    //     newStatus === DocumentStatus.APPROVED ? 'approved' : 
    //     newStatus === DocumentStatus.IN_REVIEW ? 'submitted' : 'rejected',
    //     userId,
    //     comment || null,
    //     document.current_version_id
    //   ]);
    // }

    // 5. Обновление расширенных данных в document_version
    if (newStatus !== currentStatus) {
      if (action === DocumentAction.SUBMIT_FOR_REVIEW) {
        // Фиксируем КТО отправил и КОГДА
        await client.query(`
          UPDATE document_version 
          SET 
            review_status = 'submitted',
            review_submitted_at = NOW(),
            review_submitted_by = $1,   -- Автор запроса
            review_submitted_to = $2,   -- Кому назначено (новое поле)
            review_comment = $3
          WHERE id = $4
        `, [userId, reviewerId || null, comment || null, document.current_version_id]);
      } 
      else if ([DocumentAction.APPROVE, DocumentAction.REJECT].includes(action)) {
        // Фиксируем КТО утвердил/отклонил и КОГДА
        await client.query(`
          UPDATE document_version 
          SET 
            review_status = $1,
            reviewed_at = NOW(),
            reviewed_by = $2,
            review_comment = $3
          WHERE id = $4
        `, [
          action === DocumentAction.APPROVE ? 'approved' : 'rejected',
          userId,
          comment || null,
          document.current_version_id
        ]);
      }
    }

    // 5. Возвращаем результат с данными для аудита
    // return NextResponse.json({
    //   success: true,
    //   document: updatedDocs,
    //   previousStatus: currentStatus,
    //   newStatus,
    //   action,
    //   _auditData: {
    //     oldValue: { status: currentStatus },
    //     newValue: { status: newStatus, comment },
    //     studyId: document.study_id,
    //     siteId: document.site_id,
    //     entityId: document.id
    //   }
    // });

    // 6. Возвращаем расширенный объект для аудита
    return NextResponse.json({
      success: true,
      document: updatedDocument,
      _auditData: {
        oldValue: { status: currentStatus },
        newValue: { 
          status: newStatus, 
          reviewerId: reviewerId, // Логируем, кому назначено
          fileName: document.file_name, // Логируем, какой файл
          comment 
        },
        entityId: document.id
      }
    });

  } catch (error) {
    console.error('Error applying document action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Конфигурация аудита
const auditConfig: AuditConfig = {
  action: 'UPDATE' as AuditAction,
  entityType: 'document' as AuditEntity,
  
  getEntityId: (req: NextRequest, body?: any) => {
    return body?._auditData?.entityId || 0;
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

// Оборачиваем handler в withAudit
export const POST = (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return withAudit(auditConfig)(request, async () => {
    return applyDocumentActionHandler(request, { params });
  });
};