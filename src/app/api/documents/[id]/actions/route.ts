// app/api/documents/[id]/actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/index';
import { DocumentAction, DocumentWorkFlowStatus, Transitions } from '@/types/document';
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
  reviewerId?: string; // Для отправки на ревью
}

// Функция для определения статуса документа на основе review_status
function getDocumentStatusFromReview(reviewStatus: string | null): DocumentWorkFlowStatus {
  switch (reviewStatus) {
    case 'approved':
      return DocumentWorkFlowStatus.APPROVED;
    case 'submitted':
      return DocumentWorkFlowStatus.IN_REVIEW;
    case 'rejected':
      return DocumentWorkFlowStatus.DRAFT;
    default:
      return DocumentWorkFlowStatus.DRAFT;
  }
}

// Функция для отправки документа на ревью
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

    // 1. Получаем текущую версию документа со статусом из document_version
    const { rows: documents } = await client.query(`
      SELECT 
        d.*,
        dv.id as current_version_id,
        dv.document_number,
        dv.document_name,
        dv.file_name,
        dv.file_path,
        dv.file_type,
        dv.file_size,
        dv.checksum,
        dv.uploaded_by,
        dv.uploaded_at,
        dv.review_status,
        dv.review_submitted_by,
        dv.review_submitted_at,
        dv.review_submitted_to,
        dv.reviewed_by,
        dv.reviewed_at,
        dv.review_comment
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
    const currentReviewStatus = document.review_status;
    const currentStatus = getDocumentStatusFromReview(currentReviewStatus);

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

    // 👇 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА ДЛЯ APPROVE
    // Проверяем, что пользователь является назначенным ревьюером
    if (action === DocumentAction.APPROVE || action === DocumentAction.REJECT) {
      // Получаем информацию о том, кому назначено ревью
      const { rows: reviewInfo } = await client.query(`
        SELECT review_submitted_to 
        FROM document_version 
        WHERE id = $1
      `, [document.current_version_id]);

      const assignedReviewerId = reviewInfo[0]?.review_submitted_to;

      // Если есть назначенный ревьюер, проверяем что текущий пользователь - это он
      if (assignedReviewerId && assignedReviewerId !== userId) {
        return NextResponse.json(
          { 
            error: 'Only the assigned reviewer can approve/reject this document',
            assignedReviewerId 
          },
          { status: 403 }
        );
      }

      // Проверяем, что документ действительно на ревью
      if (currentReviewStatus !== 'submitted') {
        return NextResponse.json(
          { 
            error: 'Document is not in review status',
            currentReviewStatus 
          },
          { status: 400 }
        );
      }
    }

    // Определяем новый review_status на основе действия
    let newReviewStatus: string | null = currentReviewStatus;
    let newDocumentStatus: DocumentWorkFlowStatus = currentStatus;

    switch (action) {
      case DocumentAction.SUBMIT_FOR_REVIEW:
        newReviewStatus = 'submitted';
        newDocumentStatus = DocumentWorkFlowStatus.IN_REVIEW;
        break;
      case DocumentAction.APPROVE:
        newReviewStatus = 'approved';
        newDocumentStatus = DocumentWorkFlowStatus.APPROVED;
        break;
      case DocumentAction.REJECT:
        newReviewStatus = 'rejected';
        newDocumentStatus = DocumentWorkFlowStatus.DRAFT;
        break;
      case DocumentAction.ARCHIVE:
        newDocumentStatus = DocumentWorkFlowStatus.ARCHIVED;
        break;
      case DocumentAction.UNARCHIVE:
        newDocumentStatus = DocumentWorkFlowStatus.DRAFT;
        break;
      case DocumentAction.SOFT_DELETE:
        newDocumentStatus = DocumentWorkFlowStatus.DELETED;
        break;
      case DocumentAction.RESTORE:
        newDocumentStatus = DocumentWorkFlowStatus.DRAFT;
        break;
      default:
        newDocumentStatus = currentStatus;
    }

    // 4. Обновление документа (мягкое удаление/восстановление)
    if (action === DocumentAction.SOFT_DELETE) {
      await client.query(`
        UPDATE document 
        SET 
          is_deleted = true,
          deleted_at = NOW(),
          deleted_by = $2
        WHERE id = $1
      `, [id, userId]);
    } 
    else if (action === DocumentAction.RESTORE) {
      await client.query(`
        UPDATE document 
        SET 
          is_deleted = false,
          deleted_at = NULL,
          deleted_by = NULL,
          restored_at = NOW(),
          restored_by = $2
        WHERE id = $1
      `, [id, userId]);
    }

    // 5. 👇 ОБНОВЛЕНИЕ ДЛЯ APPROVE И REJECT
    if ([DocumentAction.APPROVE, DocumentAction.REJECT].includes(action)) {
      // Утверждение или отклонение
      await client.query(`
        UPDATE document_version 
        SET 
          review_status = $1,
          reviewed_at = NOW(),
          reviewed_by = $2,
          review_comment = $3
        WHERE id = $4
      `, [
        newReviewStatus,        // 'approved' или 'rejected'
        userId,                 // Кто утвердил/отклонил
        comment || null,        // Комментарий (опционально)
        document.current_version_id
      ]);

      // 👇 ЛОГИРУЕМ ДЕЙСТВИЕ В AUDIT (дополнительно к withAudit)
      console.log(`Document ${id} ${action}d by user ${userId}`);
    }
    else if (action === DocumentAction.SUBMIT_FOR_REVIEW) {
      // Отправка на ревью (уже есть)
      await client.query(`
        UPDATE document_version 
        SET 
          review_status = $1,
          review_submitted_at = NOW(),
          review_submitted_by = $2,
          review_submitted_to = $3,
          review_comment = $4
        WHERE id = $5
      `, [
        newReviewStatus,
        userId,
        reviewerId || null,
        comment || null,
        document.current_version_id
      ]);
    }

    // 6. Получаем обновленный документ со всеми полями
    const { rows: updatedDocs } = await client.query(`
      SELECT 
        d.*,
        dv.id as current_version_id,
        dv.document_number,
        dv.document_name,
        dv.file_name,
        dv.file_path,
        dv.file_type,
        dv.file_size,
        dv.checksum,
        dv.uploaded_by,
        dv.uploaded_at,
        dv.review_status,
        dv.review_submitted_by,
        dv.review_submitted_at,
        dv.review_submitted_to,
        dv.reviewed_by,
        dv.reviewed_at,
        dv.review_comment,
        creator.name as creator_name,
        creator.email as creator_email,
        uploader.name as uploader_name,
        uploader.email as uploader_email,
        reviewer.name as reviewer_name,
        reviewer.email as reviewer_email,
        approver.name as approver_name,
        approver.email as approver_email,
        assigned.name as assigned_name,
        assigned.email as assigned_email
      FROM document d
      LEFT JOIN document_version dv ON d.current_version_id = dv.id
      LEFT JOIN users creator ON d.created_by = creator.id
      LEFT JOIN users uploader ON dv.uploaded_by = uploader.id
      LEFT JOIN users reviewer ON dv.review_submitted_by = reviewer.id
      LEFT JOIN users approver ON dv.reviewed_by = approver.id
      LEFT JOIN users assigned ON dv.review_submitted_to = assigned.id
      WHERE d.id = $1
    `, [id]);

    const updatedDocument = updatedDocs[0];
    const finalStatus = getDocumentStatusFromReview(updatedDocument.review_status);

    // 7. Формируем расширенный объект для ответа
    const enrichedDocument = {
      ...updatedDocument,
      status: finalStatus,
      document_status: finalStatus,
      creator: updatedDocument.creator_name ? {
        id: updatedDocument.created_by,
        name: updatedDocument.creator_name,
        email: updatedDocument.creator_email
      } : null,
      last_uploader: updatedDocument.uploader_name ? {
        id: updatedDocument.uploaded_by,
        name: updatedDocument.uploader_name,
        email: updatedDocument.uploader_email
      } : null,
      reviewer: updatedDocument.reviewer_name ? {
        id: updatedDocument.review_submitted_by,
        name: updatedDocument.reviewer_name,
        email: updatedDocument.reviewer_email
      } : null,
      approver: updatedDocument.approver_name ? {
        id: updatedDocument.reviewed_by,
        name: updatedDocument.approver_name,
        email: updatedDocument.approver_email
      } : null,
      assigned_reviewer: updatedDocument.assigned_name ? {
        id: updatedDocument.review_submitted_to,
        name: updatedDocument.assigned_name,
        email: updatedDocument.assigned_email
      } : null
    };

    // 8. Возвращаем расширенный объект для аудита
    return NextResponse.json({
      success: true,
      document: enrichedDocument,
      _auditData: {
        oldValue: { 
          status: currentStatus,
          review_status: currentReviewStatus,
          assigned_reviewer: document.review_submitted_to
        },
        newValue: { 
          status: finalStatus,
          review_status: newReviewStatus,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          comment 
        },
        studyId: document.study_id,
        siteId: document.site_id,
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