
// Enum для статусов исследования
export enum StudyStatus {
  PLANNED = 'planned',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  ARCHIVED = 'archived'
}

export enum FolderType {
  ROOT = 'root',
  FOLDER = 'folder',
  SUBFOLDER = 'subfolder'
}

export enum FolderStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
  ARCHIVED = 'archived'
}


export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  status: FolderStatus;
  children: Folder[];
}

export enum SiteStatus {
  PLANNED = 'planned',
  OPENED = 'opened',
  CLOSED = 'closed',
}

export interface StudySite {
  id: number;
  study_id: number;
  name: string;
  number: number;
  country: string;
  city: string;
  principal_investigator: string;
  status: SiteStatus;
}


export interface Study {
  id: number;
  title: string;
  protocol: string;
  sponsor: string;
  cro: string;
  countries: string[];
  status: StudyStatus;
  users: any[] | null;
  total_documents: number | null;
  folders_structure: Folder | null;
  audit_trail?: any[] | null;
}

export interface StudyUser {
  id:   number;
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
  last_login?: Date;
  password_changed_at?: Date;
  failed_login_attempts: number;
  created_at: string;
}

export type OrganisationType =  'CRO' | 'SPONSOR' | 'SITE';

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

export interface StudyUserWithPermissions extends StudyUser {
  permissions: UserPermissions;
}