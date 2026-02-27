// @/domain/document/document.logic.ts (или аналогичный путь)
import { Document, DocumentAction, DocumentWorkFlowStatus, Transitions as transitions } from '@/types/document';
import { UserRole } from '@/types/types';
import { ActionRoleMap } from '@/domain/document/document.policy';

  //Функция проверки прав для конкретного действия
  const hasPermissionForAction = (action: DocumentAction, userRoles: UserRole[]): boolean => {
    const allowedRoles = ActionRoleMap[action] || [];
    return userRoles.some(role => allowedRoles.includes(role));
  };

  const getBaseActions = (userRole: UserRole[]): DocumentAction[] => {
    if (!userRole) return [];
    
    const userRoles = userRole as UserRole[];
    
    return [
      DocumentAction.CREATE_DOCUMENT,
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD
    ].filter(action => hasPermissionForAction(action, userRoles));
  };

  export const getAvailableDocumentActions = (selectedDocument: Document | null, userRole: UserRole[]): DocumentAction[] => {
    // if (!selectedFolder) {
    //   return [DocumentAction.CREATE_DOCUMENT];
    // }

    if (!selectedDocument) {
      return [DocumentAction.CREATE_DOCUMENT];
    }

    // Базовые действия, доступные для всех документов с учетом роли пользователя
    const baseActions = getBaseActions(userRole);

    const currentStatus = selectedDocument.status as DocumentWorkFlowStatus;
    
    // Получаем действия на основе статуса из Transitions
    const statusActions = transitions[currentStatus] || [];
    
    // Определяем, можно ли загружать новую версию
    // Загрузка новой версии разрешена ТОЛЬКО для черновиков
    const canUploadNewVersion = currentStatus === DocumentWorkFlowStatus.DRAFT;
    
    // Определяем, нужно ли добавлять действия для удаленных/архивированных
    const isSpecialStatus = 
      currentStatus === DocumentWorkFlowStatus.DELETED || 
      currentStatus === DocumentWorkFlowStatus.ARCHIVED;

    let allActions: DocumentAction[] = [...baseActions, ...statusActions];
    
    // Добавляем UPLOAD_NEW_VERSION только для черновиков
    if (canUploadNewVersion) {
      allActions.push(DocumentAction.UPLOAD_NEW_VERSION);
    }

    // Для специальных статусов оставляем только статусные действия и базовые
    // (без UPLOAD_NEW_VERSION, который уже мог быть добавлен выше для draft)
    return [...new Set(allActions)];
  };

