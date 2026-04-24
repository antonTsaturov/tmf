export type ReportType = | 'audit' | 'document-status' | 'missing-documents';

export type FilterType = 'study' | 'country' | 'center' | 'folder';

export type ReportFilter = {
  type: FilterType;
  value: string;
  label: string;
};

export type ReportMeta = {
  total: number;
  limit: number;
  offset: number;
} | null;

export type AuditReportRequest = {
  context?: {
    studyId?: string;
    siteId?: string;
  };
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    action?: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
    status?: 'SUCCESS' | 'FAILURE';
    country?: string;
  };
  pagination?: {
    limit?: number;
    offset?: number;
  };
};

export type AuditReportResponse = {
  data: AuditLogItem[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type AuditLogItem = {
  audit_id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  entity_type: string;
  entity_id: string;
  status: 'SUCCESS' | 'FAILURE';
  site_id: string | null;
  study_id: string | null;
  ip_address: string | null;
};

export type ReportContext = {
  studyId?: string | null;
  siteId?: string | null;
};

export type AuditChange = {
  field: string;
  old: any;
  new: any;
};

export type AuditReportMeta = {
  total: number;
};