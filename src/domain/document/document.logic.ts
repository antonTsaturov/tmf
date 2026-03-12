// @/domain/document/document.logic.ts (или аналогичный путь)
import { Document, DocumentAction } from '@/types/document';
import { Transitions as transitions } from '@/domain/document/document.transitions';
import { UserRole } from '@/types/types';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { DocumentWorkFlowStatus } from '@/types/document.status';

// Функция проверки прав для конкретного действия
const hasPermissionForAction = (action: DocumentAction, userRoles: UserRole[]): boolean => {

  if (!userRoles || !Array.isArray(userRoles)) {
    return false;
  }
      
  const allowedRoles = ActionRoleMap[action] || [];
  return userRoles.some(role => allowedRoles.includes(role));
};

export const getAvailableDocumentActions = (selectedDocument: Document | null, userRole: UserRole[]): DocumentAction[] => {

  // Если документ не выбран - только кнопка создать документ (если есть права на создание документов)
  if (!selectedDocument) {
    return [DocumentAction.CREATE_DOCUMENT]
    .filter(action => hasPermissionForAction(action, userRole));
  }

  if (selectedDocument.is_deleted) {
    return [DocumentAction.CREATE_DOCUMENT, DocumentAction.VIEW]
    .filter(action => hasPermissionForAction(action, userRole));
  }

  const currentStatus = selectedDocument.status as DocumentWorkFlowStatus;
  
  // Получаем действия на основе статуса из Transitions
  const statusActions = transitions[currentStatus] || [];
  
  // Фильтруем действия по ролям
  let roleActions: DocumentAction[] = [ ...statusActions]
  .filter(action => hasPermissionForAction(action, userRole));
  
  // Возвращаем Set для удаления случайных дубликатов
  return [...new Set(roleActions)];
};

