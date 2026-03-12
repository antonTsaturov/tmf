export enum DocumentWorkFlowStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  ARCHIVED = 'archived',  // Удалить позднее, use DocumentLifeCycleStatus
  DELETED = 'deleted' // Удалить позднее, use DocumentLifeCycleStatus
}

export enum DocumentLifeCycleStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}