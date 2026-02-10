import { UserRole, UserPermissions } from "@/types/types";

// Матрица разрешений по ролям
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    // Документы - полный доступ
    canViewDocument: true,
    canUploadDocument: true,
    canEditDocument: true,
    canDeleteDocument: true,
    canReviewDocument: true,
    canApproveDocument: true,
    canRejectDocument: true,
    canLockDocument: true,
    canArchiveDocument: true,
    canExportDocument: true,
    canRestoreDocument: true,
    canGenerateReports: true,
    
    // Управление системой
    canManageUsers: true,
    canManageStudy: true,
    canManageSite: true,
    canFolderStructure: true,
    canChangeUserPermissions: true,
  },

  [UserRole.STUDY_MANAGER]: {
    // Документы - полный доступ в рамках исследования
    canViewDocument: true,
    canUploadDocument: true,
    canEditDocument: true,
    canDeleteDocument: true,
    canReviewDocument: true,
    canApproveDocument: true,
    canRejectDocument: true,
    canLockDocument: true,
    canArchiveDocument: true,
    canExportDocument: true,
    canRestoreDocument: true,
    canGenerateReports: true,
    
    // Управление исследованием
    canManageUsers: false,     // В рамках исследования
    canManageStudy: false,     // Свое исследование
    canManageSite: false,      // Все центры исследования
    canFolderStructure: false, // Структура исследования
    canChangeUserPermissions: false, // В рамках исследования
  },

  [UserRole.DATA_MANAGER]: {
    // Документы - работа с данными
    canViewDocument: true,
    canUploadDocument: true,
    canEditDocument: true,    // Метаданные
    canDeleteDocument: true, // Только через workflow
    canReviewDocument: true,
    canApproveDocument: true, // Техническая проверка
    canRejectDocument: true,
    canLockDocument: true,    // Блокировка некорректных данных
    canArchiveDocument: true,
    canExportDocument: true,
    canRestoreDocument: true,
    canGenerateReports: true,
    
    // Управление - ограниченное
    canManageUsers: false,
    canManageStudy: false,
    canManageSite: false,
    canFolderStructure: true, // Для организации данных
    canChangeUserPermissions: false,
  },

  [UserRole.MONITOR]: {
    // Документы - мониторинг центров
    canViewDocument: true,
    canUploadDocument: true,  // Загрузка отчетов мониторинга
    canEditDocument: true,    // Исправление замечаний
    canDeleteDocument: false,
    canReviewDocument: false,  // Проверка документов центра
    canApproveDocument: false,
    canRejectDocument: false,  // Отклонение некорректных документов
    canLockDocument: false,
    canArchiveDocument: false,
    canExportDocument: true,  // Экспорт для отчетов
    canRestoreDocument: false,
    canGenerateReports: true, // Отчеты по мониторингу
    
    // Управление - только центры
    canManageUsers: false,
    canManageStudy: false,
    canManageSite: true,      // Свои центры
    canFolderStructure: false,
    canChangeUserPermissions: false,
  },

  [UserRole.INVESTIGATOR]: {
    // Документы - работа в своем центре
    canViewDocument: true,
    canUploadDocument: true,  // Загрузка документов центра
    canEditDocument: true,    // Свои документы
    canDeleteDocument: false,
    canReviewDocument: false,  // Просмотр на подпись
    canApproveDocument: false,
    canRejectDocument: false,
    canLockDocument: false,
    canArchiveDocument: false,
    canExportDocument: true,  // Свои документы
    canRestoreDocument: false,
    canGenerateReports: false,
    
    // Управление - только свой центр
    canManageUsers: false,
    canManageStudy: false,
    canManageSite: false,      // Только свой центр
    canFolderStructure: false,
    canChangeUserPermissions: false,
  },

  [UserRole.COORDINATOR]: {
    // Документы - координация центра
    canViewDocument: true,
    canUploadDocument: true,  // Все документы центра
    canEditDocument: true,    // Документы центра
    canDeleteDocument: false,
    canReviewDocument: false,  // Предварительная проверка
    canApproveDocument: false,
    canRejectDocument: false,  // Возврат на доработку
    canLockDocument: false,
    canArchiveDocument: false,
    canExportDocument: true,
    canRestoreDocument: false,
    canGenerateReports: true, // Отчеты по центру
    
    // Управление - свой центр
    canManageUsers: false,
    canManageStudy: false,
    canManageSite: true,      // Свой центр
    canFolderStructure: false,
    canChangeUserPermissions: false,
  },

  [UserRole.AUDITOR]: {
    // Документы - только чтение и аудит
    canViewDocument: true,
    canUploadDocument: false,
    canEditDocument: false,
    canDeleteDocument: false,
    canReviewDocument: false,  // Для аудита
    canApproveDocument: false,
    canRejectDocument: false,
    canLockDocument: false,
    canArchiveDocument: false,
    canExportDocument: false,  // Для аудиторских отчетов
    canRestoreDocument: false,
    canGenerateReports: false, // Аудиторские отчеты
    
    // Управление - нет
    canManageUsers: false,
    canManageStudy: false,
    canManageSite: false,
    canFolderStructure: false,
    canChangeUserPermissions: false,
  },

  [UserRole.QUALITY_ASSURANCE]: {
    // Документы - контроль качества
    canViewDocument: true,
    canUploadDocument: false,
    canEditDocument: false,
    canDeleteDocument: false,
    canReviewDocument: true,  // QA проверка
    canApproveDocument: true,
    canRejectDocument: true,  // Отклонение при нарушении качества
    canLockDocument: false,    // Блокировка некачественных документов
    canArchiveDocument: false,
    canExportDocument: false,
    canRestoreDocument: false,
    canGenerateReports: true, // QA отчеты
    
    // Управление - нет
    canManageUsers: false,
    canManageStudy: false,
    canManageSite: false,
    canFolderStructure: false,
    canChangeUserPermissions: false,
  },

  [UserRole.READ_ONLY]: {
    // Документы - только просмотр
    canViewDocument: true,
    canUploadDocument: false,
    canEditDocument: false,
    canDeleteDocument: false,
    canReviewDocument: false,
    canApproveDocument: false,
    canRejectDocument: false,
    canLockDocument: false,
    canArchiveDocument: false,
    canExportDocument: false,
    canRestoreDocument: false,
    canGenerateReports: false,
    
    // Управление - нет
    canManageUsers: false,
    canManageStudy: false,
    canManageSite: false,
    canFolderStructure: false,
    canChangeUserPermissions: false,
  },
};

// Утилитарные функции для работы с разрешениями
export function getPermissionsForRole(role: UserRole[]): UserPermissions {
  return ROLE_PERMISSIONS[role as unknown as UserRole] || ROLE_PERMISSIONS[UserRole.READ_ONLY];
}

// Функция для получения permissions на основе ролей
// const getPermissionsFromRoles = (roles: UserRole[]): UserPermissions => {
//   // У пользователя может быть только одна роль
//   if (roles.length === 0) {
//     // Возвращаем все false для пустой роли
//     return {
//       canViewDocument: false,
//       canUploadDocument: false,
//       canEditDocument: false,
//       canDeleteDocument: false,
//       canReviewDocument: false,
//       canApproveDocument: false,
//       canRejectDocument: false,
//       canLockDocument: false,
//       canArchiveDocument: false,
//       canExportDocument: false,
//       canRestoreDocument: false,
//       canGenerateReports: false,
//       canManageUsers: false,
//       canManageStudy: false,
//       canManageSite: false,
//       canFolderStructure: false,
//       canChangeUserPermissions: false,
//     };
//   }
  
//   // Используем первую роль (у пользователя может быть только одна)
//   const role = roles[0];
//   return getPermissionsForRole([role]);
// };

export function hasPermission(
  role: UserRole, 
  permissionKey: keyof UserPermissions
): boolean {
  const permissions = getPermissionsForRole(role as unknown as UserRole[]);
  return permissions[permissionKey];
}

export function checkMultiplePermissions(
  role: UserRole,
  permissionKeys: (keyof UserPermissions)[]
): boolean {
  const permissions = getPermissionsForRole(role as unknown as UserRole[]);
  return permissionKeys.every(key => permissions[key]);
}

// Функция для проверки разрешения с учетом контекста (исследование/центр)
export function checkPermissionInContext(
  role: UserRole,
  permissionKey: keyof UserPermissions,
  context: {
    studyId?: number;
    siteId?: number;
    userId?: number; // Для проверки OWN разрешений
  }
): boolean {
  const hasGlobalPermission = hasPermission(role, permissionKey);
  
  if (!hasGlobalPermission) return false;
  
  // Дополнительные проверки контекста
  switch (role) {
    case UserRole.STUDY_MANAGER:
      // STUDY_MANAGER может управлять только своими исследованиями
      // Здесь нужна дополнительная логика проверки принадлежности исследования
      return true;
      
    case UserRole.MONITOR:
      // MONITOR может управлять только назначенными центрами
      // Проверка: является ли siteId в списке назначенных центров монитора
      return true;
      
    case UserRole.INVESTIGATOR:
    case UserRole.COORDINATOR:
      // Только свой центр
      // Проверка: userId === site.principal_investigator_id или site.coordinator_id
      return true;
      
    default:
      return true;
  }
}