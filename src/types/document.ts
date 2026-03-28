
import { DocumentWorkFlowStatus } from '@/types/document.status';

export enum DocumentAction {
  CREATE_DOCUMENT = 'create_document',
  SUBMIT_FOR_REVIEW = 'submit_for_review',
  APPROVE = 'approve',
  REJECT = 'reject',
  ARCHIVE = 'archive',
  UNARCHIVE = 'unarchive',
  SOFT_DELETE = 'soft_delete',
  RESTORE = 'restore',
  UPLOAD_NEW_VERSION = 'upload_new_version',
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit'
}

export type DocumentType = 'pdf';

interface ShortUserInfo {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface Document {
  study_id: number;
  site_id: number | string | null;
  folder_name: string;
  tmf_zone: string | null;
  tmf_artifact: string | null;
  status: DocumentWorkFlowStatus;
  created_by: string; // UUID
  created_at: string;
  current_version: DocumentVersionRow;

  is_deleted: boolean;
  deleted_at: string;
  deleted_by: string;
  deletion_reason: string;

  restored_by?: string;
  restored_at?: string;
  restoration_reason?: string;

  is_archived?: boolean;
  archived_at?: string;
  archived_by?: string;

  unarchived_at: string;
  unarchived_by: string;
  unarchive_reason: string;


  id: string;
  document_number: number;
  document_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | string;
  checksum: string;
  
  // Дополнительные поля для овместимости с PendingDocument
  folder_id: string;
  review_status?: string;
  review_submitted_at?: string;
  review_submitted_by?: string;
  review_submitter?: ShortUserInfo;
  review_comment?: string | null;
  uploader?: ShortUserInfo | null;
  submitter?: ShortUserInfo | null;
  creator?: ShortUserInfo| null;
  archiver?: ShortUserInfo| null;
  unarchiver?: ShortUserInfo| null;

  version_id?: string;
}

export interface DocumentVersionRow {
  id: string;
  document_id: string;
  document_number: number;
  document_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  checksum: string;
  uploaded_by: string;
  uploaded_at: string;
  change_reason: string | null;
  review_status?: string | null;
  review_submitted_at?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
  
  // Информация о пользователях
  uploader?: ShortUserInfo | null;
  reviewer?: ShortUserInfo | null;
  approver?: ShortUserInfo | null;
  assigned_reviewer?: ShortUserInfo| null;
  review_submitter?: ShortUserInfo | null;

}