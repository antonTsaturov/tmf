// app/api/documents/[id]/actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { DocumentAction } from '@/types/document';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { UserRole } from '@/types/types';
import { withAudit, AuditContext } from '@/lib/audit/audit.middleware';
import { AuditService } from '@/lib/audit/audit.service';
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { Transitions } from '@/domain/document/document.transitions';
import { AuditAction, AuditEntity } from '@/types/audit';
import { logger } from '@/lib/logger';

interface ActionRequest {
  action: DocumentAction;
  userId: string;
  userRole: UserRole;
  comment?: string;
  reviewerId?: string;
}

function getDocumentStatusFromReview(reviewStatus: string | null): DocumentWorkFlowStatus {
  switch (reviewStatus) {
    case 'approved': return DocumentWorkFlowStatus.APPROVED;
    case 'submitted': return DocumentWorkFlowStatus.IN_REVIEW;
    case 'rejected': return DocumentWorkFlowStatus.DRAFT;
    default: return DocumentWorkFlowStatus.DRAFT;
  }
}

export async function applyDocumentActionHandler(
  request: NextRequest, 
  ctx: AuditContext, 
) {
  const client = getPool();

  try {
    // ВАЖНО: Используем ctx.body, так как request.json() уже вызван в мидлваре
    const body: ActionRequest = ctx.body;
    
    // 1. Получаем данные ТЕКУЩЕГО авторизованного пользователя через сервис
    const user = AuditService.getUserFromRequest(request);
    // Извлекаем данные из сессии, а не из body для безопасности
    const currentUserId = user.user_id?.toString();
    const currentUserRoles = user.user_role || [];
    
    // Проверка: является ли пользователь администратором
    const isSystemAdmin = currentUserRoles.includes('admin' as UserRole) || currentUserRoles.includes(UserRole.ADMIN);


    if (!body || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: action, userId, userRole' },
        { status: 400 }
      );
    }

    const parts = request.nextUrl.pathname.split('/');
    const id =  parts[parts.indexOf('documents') + 1] || '0';

    const { action, comment, reviewerId } = body;

    // 1. Получаем текущую версию документа
    const { rows: documents } = await client.query(`
      SELECT 
        d.*, 
        dv.id as current_version_id, 
        dv.review_status, 
        dv.review_submitted_to,
        dv.review_submitted_by,
        dv.review_submitted_at
      FROM document d
      LEFT JOIN document_version dv ON d.current_version_id = dv.id
      WHERE d.id = $1 AND d.is_deleted = false
    `, [id]);

    
    if (documents.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = documents[0];
    //const currentReviewStatus = document.review_status;
    const currentStatus = getDocumentStatusFromReview(document.review_status);

    // 2. Валидация переходов (Transitions)
    const allowedActions = Transitions[currentStatus] || [];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: 'Action not allowed', currentStatus }, { status: 403 });
    }

    // 3. Валидация ролей (ActionRoleMap)
    const allowedRoles = ActionRoleMap[action] || [];
    const hasRequiredRole = currentUserRoles.some(role => allowedRoles.includes(role));
    
    if (!isSystemAdmin) {
      if (!hasRequiredRole) {
        return NextResponse.json({ error: 'Role not authorized' }, { status: 403 });
      }
      
    }

    // Дополнительная проверка для ревьюера
    if ([DocumentAction.APPROVE, DocumentAction.REJECT].includes(action)) {
      const submittedTo = document.review_submitted_to
        const isAssignedReviewer = submittedTo === currentUserId;
        logger.debug('submittedTo  currentUserId: ', { submittedTo, currentUserId })
        // ЕСЛИ не админ И не назначенный ревьюер -> ОШИБКА
        if (!isSystemAdmin && !isAssignedReviewer) {
            return NextResponse.json({ 
              error: 'Only assigned reviewer or Admin can perform this action' 
            }, { status: 403 });
        }

        if (document.review_status !== 'submitted' && !isSystemAdmin) {
            return NextResponse.json({ error: 'Document not in review' }, { status: 400 });
        }
    }

    let newReviewStatus: string | null = document.review_status;
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

    // ОБНОВЛЕНИЕ ДЛЯ APPROVE И REJECT
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
        currentUserId,                 // Кто утвердил/отклонил
        comment || null,        // Комментарий (опционально)
        document.current_version_id
      ]);

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
        currentUserId,    //Кто отправил
        reviewerId, // Кому отправил
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
      review_submitter: updatedDocument.reviewer_name ? {
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
      } : null,
       
    };

    // 8. Возвращаем расширенный объект для аудита
    return NextResponse.json({
      success: true,
      document: enrichedDocument,
      _auditData: {
        oldValue: { 
          status: currentStatus,
          review_status: document.review_status,
          assigned_reviewer: document.review_submitted_to
        },
        newValue: { 
          status: finalStatus,
          review_status: newReviewStatus,
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString(),
          comment 
        },
        studyId: document.study_id,
        siteId: document.site_id,
        entityId: document.id
      }
    });

  } catch (error) {
    logger.error('Error applying document action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


export const POST = withAudit(
  {
    action: 'UPDATE' as AuditAction,
    entityType: 'document' as AuditEntity,


    getEntityId: (ctx, req) => {
      const parts = req.nextUrl.pathname.split('/');
      return parts[parts.indexOf('documents') + 1] || '0';
    },

    getStudyId: (ctx) => {
      return String(ctx.body?.studyId ?? ctx.body?._auditData?.studyId ?? '');
    },

    getSiteId: (ctx) => {
      return String(ctx.body?.siteId ?? ctx.body?._auditData?.siteId ?? '');
    },

    // Мидлвар вызывает getOldValue ДО хендлера для получения состояния из БД.
    getOldValue: async (ctx, req) => {
      const parts = req.nextUrl.pathname.split('/');
      const id = parts[parts.indexOf('documents') + 1];
      const client = getPool();
      try {
        const { rows } = await client.query(
          'SELECT review_status FROM document_version dv JOIN document d ON d.current_version_id = dv.id WHERE d.id = $1',
          [id]
        );
        return rows[0] || null;
      } catch (error) {
        logger.error('getOldValue error:', error)
      }
    },

    // Мидлвар вызывает это ПОСЛЕ хендлера. Берем данные из того, что пришло в запросе
    getNewValue: (ctx) => {
      return {
        action: ctx.body?.action,
        comment: ctx.body?.comment,
        userId: ctx.body?.userId,
        timestamp: new Date().toISOString()
      };
    }
  },

  applyDocumentActionHandler

);