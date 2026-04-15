export type OrganisationType = 'CRO' | 'SPONSOR' | 'SITE';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  TERMINATED = 'terminated'
}

export enum UserRole {
  ADMIN = 'admin',
  STUDY_MANAGER = 'study_manager',
  DATA_MANAGER = 'data_manager',
  MONITOR = 'monitor',
  INVESTIGATOR = 'investigator',
  COORDINATOR = 'coordinator',
  AUDITOR = 'auditor',
  QUALITY_ASSURANCE = 'qa',
  READ_ONLY = 'read_only',
}

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  [UserRole.ADMIN]: { label: 'Administrator', color: '#e64980' },
  [UserRole.STUDY_MANAGER]: { label: 'Study Manager', color: '#228be6' },
  [UserRole.DATA_MANAGER]: { label: 'Data Manager', color: '#20c997' },
  [UserRole.MONITOR]: { label: 'Monitor', color: '#fd7e14' },
  [UserRole.INVESTIGATOR]: { label: 'Investigator', color: '#be4bdb' },
  [UserRole.COORDINATOR]: { label: 'Coordinator', color: '#15aabf' },
  [UserRole.AUDITOR]: { label: 'Auditor', color: '#fab005' },
  [UserRole.QUALITY_ASSURANCE]: { label: 'Quality Assurance', color: '#40c057' },
  [UserRole.READ_ONLY]: { label: 'Read Only', color: '#868e96' },
};

export interface UserPermissions {
  canViewDocument: boolean;
  canUploadDocument: boolean;
  canEditDocument: boolean;
  canDeleteDocument: boolean;
  canReviewDocument: boolean;
  canApproveDocument: boolean;
  canRejectDocument: boolean;
  canLockDocument: boolean;
  canArchiveDocument: boolean;
  canExportDocument: boolean;
  canRestoreDocument: boolean;
  canGenerateReports: boolean;

  canManageUsers: boolean;
  canManageStudy: boolean;
  canManageSite: boolean;
  canFolderStructure: boolean;
  canChangeUserPermissions: boolean;
}

export interface StudyUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  title?: string;
  organisation: OrganisationType;
  role: UserRole[];
  status: UserStatus;
  permissions: UserPermissions;
  assigned_study_id: number[];
  assigned_site_id: number[];
  email_notifications_enabled: boolean;
  last_login?: Date;
  password_changed_at?: Date;
  failed_login_attempts: number;
  created_at: string;
}

export interface StudyUserWithPermissions extends StudyUser {
  permissions: UserPermissions;
}
