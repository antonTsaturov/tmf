// Сервис для управления статусами документов
import { DocumentLifeCycleStatus } from '@/types/document.status';

export interface VersionStatus {
  review_status?: string;
}

export class DocumentStatusService {
  determineStatus(
    isArchived: boolean,
    isDeleted: boolean,
    latestVersion: VersionStatus
  ): string {
    if (isArchived) return DocumentLifeCycleStatus.ARCHIVED;
    if (isDeleted) return DocumentLifeCycleStatus.DELETED;
    
    if (latestVersion.review_status === 'approved') return 'approved';
    if (latestVersion.review_status === 'submitted') return 'in_review';
    return 'draft';
  }

  getLatestVersion(versions: any[]): any {
    return versions[0] || {};
  }
}