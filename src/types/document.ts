export type DocumentStatus = 'draft' | 'on review' | 'approved' | 'rejected' | 'archived' | 'deleted';

export type DocumentType = 'pdf';

export interface Document {
  id: string; // UUID
  study_id: number;
  site_id: number | string;
  folder_id: string;
  folder_name: string;
  tmf_zone: string | null;
  tmf_artifact: string | null;
  status: DocumentStatus;
  current_version_id: string; // UUID
  created_by: string; // UUID
  created_at: string;
  is_deleted: boolean;
}

export interface DocumentVersion {
  id: string; // UUID
  document_id: string; // UUID
  document_version: number;
  document_name: string;
  file_name: string;
  file_path: string;
  file_type: DocumentType;
  file_size: string; 
  checksum: string;
  uploaded_by: string; // UUID
  uploaded_at: string;
  change_reason: string;
}