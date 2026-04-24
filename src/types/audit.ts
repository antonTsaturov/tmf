import { UserRole } from '@/types/user';
// Audit types
export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'EXPORT'
  | 'APPROVE'
  | 'REJECT'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'SUBMIT';

export type AuditEntity = 'document' | 'document_version' | 'user' | 'site' | 'study' | 'audit';

export type AuditStatus = 'SUCCESS' | 'FAILURE';

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  userEmail?: string;
  action?: AuditAction;
  entityType?: AuditEntity;
  entityId?: string;
  status?: AuditStatus;
  siteId?: string;
  studyId?: string;
  search?: string;
}

export interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogEntry {
  audit_id?: string; // UUID
  created_at: string;
  user_id: string;
  user_name?: string;
  user_email: string;
  user_role: UserRole[];
  action: AuditAction;
  entity_type: AuditEntity;
  entity_id: string;
  document_name?: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string;
  user_agent: string;
  session_id: string;
  status: AuditStatus;
  error_message?: string | null;
  reason?: string;
  site_id: string | null;
  study_id: string | null;
  study_protocol?: string;
  site_name?: string;
}

export interface AuditResponse {
  logs: AuditLogEntry[];
  pagination: AuditPagination;
}
