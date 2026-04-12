// Re-exports for backward compatibility
export { UserStatus, UserRole, ROLE_CONFIG } from './user';
export type { UserPermissions, StudyUser, StudyUserWithPermissions, OrganisationType } from './user';
export { StudyStatus } from './study';
export type { Study } from './study';
export { SiteStatus } from './site';
export type { StudySite } from './site';
export { Colors } from '@/lib/config/constants';

export enum ViewLevel {
  ROOT = 'root',
  SITE = 'site',
  GENERAL = 'general',
  COUNTRY= 'country'
};

