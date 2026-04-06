// Re-exports for backward compatibility
export { UserStatus, UserRole, ROLE_CONFIG } from './user';
export type { UserPermissions, StudyUser, StudyUserWithPermissions, OrganisationType } from './user';
export { StudyStatus } from './study';
export type { Study } from './study';
export { SiteStatus } from './site';
export type { StudySite } from './site';
export { Colors } from '@/lib/config/constants';

// Import for internal use
//import type { UserRole as UserRoleType } from './user';

// Folder types (kept here - shared between document and site)
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

// export enum FolderViewLevel {
//   SITE = 'site',
//   GENERAL = 'general',
//   ROOT = 'root'
// };

export enum ViewLevel {
  ROOT = 'root',
  SITE = 'site',
  GENERAL = 'general',
  COUNTRY= 'country'
};

export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  level?: ViewLevel;
  status: FolderStatus;
  children: Folder[];
  shouldEdit: boolean;
}

