// @/domain/document/document.logic.ts
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { Document, DocumentAction } from '@/types/document';
import { Transitions, SiteStatusTransitions, StudyStatusTransitions } from '@/domain/document/document.transitions';
import { UserRole, SiteStatus, StudyStatus } from '@/types/types';
import { ActionRoleMap } from '@/domain/document/document.policy';

// Функция проверки прав для конкретного действия
const hasPermissionForAction = (action: DocumentAction, userRoles: UserRole[]): boolean => {

  if (!userRoles || !Array.isArray(userRoles)) {
    return false;
  }

  const allowedRoles = ActionRoleMap[action] || [];
  return userRoles.some(role => allowedRoles.includes(role));
};

/**
 * Получает доступные действия для документа на основе:
 * - статуса документа (DocumentWorkFlowStatus)
 * - статуса сайта (SiteStatus)
 * - статуса исследования (StudyStatus)
 * - роли пользователя (UserRole[])
 * 
 * Действие доступно только если оно разрешено по ВСЕМ четырём измерениям
 */
export const getAvailableDocumentActions = (
  selectedDocument: Document | null,
  userRole: UserRole[],
  siteStatus?: SiteStatus,
  studyStatus?: StudyStatus
): DocumentAction[] => {

  // Если документ не выбран - только кнопка создать документ (если есть права)
  if (!selectedDocument) {
    return [DocumentAction.CREATE_DOCUMENT]
      .filter(action => hasPermissionForAction(action, userRole));
  }

  if (selectedDocument.is_deleted) {
    return [DocumentAction.CREATE_DOCUMENT, DocumentAction.VIEW]
      .filter(action => hasPermissionForAction(action, userRole));
  }

  const currentDocStatus = selectedDocument.status as DocumentWorkFlowStatus;

  // Получаем действия по каждому измерению
  const documentActions = Transitions[currentDocStatus] || [];
  const siteActions = siteStatus ? SiteStatusTransitions[siteStatus] : [];
  const studyActions = studyStatus ? StudyStatusTransitions[studyStatus] : [];

  // Если siteStatus/studyStatus не переданы - не ограничиваем по этим измерениям
  let availableActions = documentActions;
  
  if (siteStatus && siteActions) {
    availableActions = availableActions.filter(action => siteActions.includes(action));
  }
  
  if (studyStatus && studyActions) {
    availableActions = availableActions.filter(action => studyActions.includes(action));
  }

  // Фильтруем по ролям пользователя
  const roleActions = availableActions.filter(action => hasPermissionForAction(action, userRole));

  // Возвращаем Set для удаления дубликатов
  return [...new Set(roleActions)];
};

