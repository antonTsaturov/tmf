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
  DOWNLOAD = 'download'
}

export enum DocumentWorkFlowStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  ARCHIVED = 'archived',  // Удалить позднее
  DELETED = 'deleted' // Удалить позднее
}

export enum DocumentLifeCycleStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export type DocumentType = 'pdf';

export interface Document {
  // id: string; // UUID
  study_id: number;
  site_id: number | string;
  // folder_id: string;
  folder_name: string;
  tmf_zone: string | null;
  tmf_artifact: string | null;
  status: DocumentWorkFlowStatus;
  // current_version_id: string; // UUID
  created_by: string; // UUID
  created_at: string;

  is_deleted: boolean;
  deleted_at: string;
  deleted_by: string;
  deletion_reason: string;

  restored_by: string;
  restored_at: string;

  is_archived: boolean;
  archived_at: string;
  archived_by: string;

  id: string;
  document_number: number;
  document_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | string;
  checksum: string;
  // uploaded_by: string;
  // uploaded_at: string;
  // change_reason: string;  

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
  review_status: string;
  review_submitted_by: string;
  review_submitted_at: string;
  review_submitted_to: string;
  reviewed_by: string;
  reviewed_at: string;
  review_comment: string;
}

export const Transitions: Record<DocumentWorkFlowStatus, DocumentAction[]> = {
  draft: [
    DocumentAction.CREATE_DOCUMENT,
    DocumentAction.SUBMIT_FOR_REVIEW,
    DocumentAction.SOFT_DELETE,
    DocumentAction.UPLOAD_NEW_VERSION
  ],
  in_review: [
    DocumentAction.APPROVE,
    DocumentAction.REJECT,
    // DocumentAction.CANCEL_REVIEW
  ],
  approved: [
    DocumentAction.ARCHIVE
  ],
  archived: [
    DocumentAction.UNARCHIVE
  ],
  deleted: [

    DocumentAction.RESTORE
  ]
}
