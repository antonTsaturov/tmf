// DTO (Data Transfer Objects) для документов
export interface GetDocumentsQueryDTO {
  study_id: string;
  site_id?: string | null;
  country?: string | null;
  folder_id: string;
  include_deleted?: boolean;
  include_archived?: boolean;
}

export interface DocumentVersionDTO {
  id: number;
  document_id: number;
  document_number: number;
  document_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  review_status: string;
  review_comments?: string;
  review_submitted_at?: Date;
  review_submitted_by?: number;
  review_submitted_to?: number;
  reviewed_at?: Date;
  reviewed_by?: number;
  uploaded_at: Date;
  uploaded_by: number;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
  review_submitter?: {
    id: number;
    name: string;
    email: string;
    role: number;
  };
  approver?: {
    id: number;
    name: string;
    email: string;
  };
  assigned_reviewer?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface DocumentResponseDTO {
  id: number;
  study_id: number;
  folder_id: number;
  site_id?: number | null;
  country?: string | null;
  created_at: Date;
  created_by: number;
  updated_at?: Date;
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  restored_at?: Date;
  restored_by?: number;
  is_archived: boolean;
  archived_at?: Date;
  archived_by?: number;
  unarchived_at?: Date;
  unarchived_by?: number;
  versions: DocumentVersionDTO[];
  current_version: Partial<DocumentVersionDTO>;
  file_type?: string;
  status: string;
  total_versions: number;
  document_name?: string;
  document_number?: number;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  deleted_by_info?: {
    name: string;
    email: string;
    role: string;
    deleted_at: Date;
  };
  restored_by_info?: {
    name: string;
    email: string;
    role: string;
  };
  archived_by_info?: {
    name: string;
    email: string;
    role: string;
    archived_at: Date;
  };
  unarchived_by_info?: {
    name: string;
    email: string;
    role: string;
  };
}

export interface GetDocumentsResponseDTO {
  documents: DocumentResponseDTO[];
  count: number;
}