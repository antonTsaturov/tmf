import { Colors } from "@/lib/config/constants";

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

export const DocumentStatusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'DRAFT', color: Colors.GRAY },
    in_review: { label: 'IN REVIEW', color: Colors.BLUE },
    approved: { label: 'APPROVED', color: Colors.GREEN },
    archived: { label: 'ARCHIVED', color: Colors.YELLOW },
    deleted: { label: 'DELETED', color: Colors.RED },
  };
