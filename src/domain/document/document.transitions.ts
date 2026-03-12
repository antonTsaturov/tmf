import { DocumentAction } from "@/types/document";
import { SiteStatus, StudyStatus } from "@/types/types";
import { DocumentWorkFlowStatus } from "@/types/document.status";

const BASE_ACTIONS: DocumentAction[] = [
  DocumentAction.CREATE_DOCUMENT,
  DocumentAction.VIEW,
  DocumentAction.DOWNLOAD,
]

export const Transitions: Record<DocumentWorkFlowStatus, DocumentAction[]> = {
  draft: [
    ...BASE_ACTIONS,
    DocumentAction.SUBMIT_FOR_REVIEW,
    DocumentAction.UPLOAD_NEW_VERSION,
    DocumentAction.EDIT,
    DocumentAction.SOFT_DELETE
  ],
  in_review: [
    ...BASE_ACTIONS,
    DocumentAction.APPROVE,
    DocumentAction.REJECT,
  ],
  approved: [
    ...BASE_ACTIONS,
    DocumentAction.ARCHIVE,
  ],
  archived: [
    ...BASE_ACTIONS,
    DocumentAction.UNARCHIVE
  ],
  deleted: [
    ...BASE_ACTIONS,
    DocumentAction.RESTORE
  ]
}

export const SiteStatusTransitions: Record<SiteStatus, DocumentAction[]> = {
  planned: [
    DocumentAction.CREATE_DOCUMENT
  ],
  opened: [
    ...BASE_ACTIONS,
    DocumentAction.APPROVE,
    DocumentAction.REJECT,
    DocumentAction.SUBMIT_FOR_REVIEW,
    DocumentAction.UPLOAD_NEW_VERSION,
    DocumentAction.EDIT,
    DocumentAction.SOFT_DELETE,
    DocumentAction.ARCHIVE,
    DocumentAction.UNARCHIVE,
    DocumentAction.RESTORE
  ],
  frozen: [
    DocumentAction.VIEW,
    DocumentAction.DOWNLOAD,
  ],
  closed: [
    DocumentAction.VIEW,
  ]
}

export const StudyStatusTransitions: Record<StudyStatus, DocumentAction[]> = {
  planned: [
    DocumentAction.VIEW
  ],
  ongoing: [
    ...BASE_ACTIONS,
    DocumentAction.APPROVE,
    DocumentAction.REJECT,
    DocumentAction.SUBMIT_FOR_REVIEW,
    DocumentAction.UPLOAD_NEW_VERSION,
    DocumentAction.EDIT,
    DocumentAction.SOFT_DELETE,
    DocumentAction.ARCHIVE,
    DocumentAction.UNARCHIVE,
    DocumentAction.RESTORE
  ],
  completed: [
    DocumentAction.VIEW,
    DocumentAction.DOWNLOAD,
    DocumentAction.APPROVE,
    DocumentAction.REJECT,
    DocumentAction.ARCHIVE
  ],
  terminated: [
    DocumentAction.VIEW,
    DocumentAction.DOWNLOAD
  ],
  archived: [
    DocumentAction.VIEW,
  ]
}
