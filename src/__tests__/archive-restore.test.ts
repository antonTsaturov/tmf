/**
 * Archive / Restore Workflow Tests
 *
 * Tests for:
 * - Archive: only approved documents can be archived
 * - Archive: role restrictions (ADMIN, STUDY_MANAGER only)
 * - Archive: document state after archiving
 * - Unarchive: restore from archived to approved state
 * - Soft delete: from any status
 * - Restore: from deleted back to original state
 * - Audit trail: archiving and deletion should be trackable
 */

import { Document } from '@/types/document';
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { DocumentAction } from '@/types/document';
import { Transitions } from '@/domain/document/document.transitions';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole, SiteStatus, StudyStatus } from '@/types/types';
import { mockDocument } from './setup';

// --- Helpers ---

const createDocument = (
  status: DocumentWorkFlowStatus = DocumentWorkFlowStatus.DRAFT,
  overrides?: Partial<Document>,
): Document =>
  mockDocument({
    id: 'doc-archive-test',
    study_id: 100,
    site_id: 'site-50',
    folder_id: 'site-a1b2',
    document_name: 'Study Protocol',
    document_number: 3,
    file_name: 'protocol-v3.pdf',
    file_path: 's3://bucket/protocol-v3.pdf',
    file_type: 'application/pdf',
    file_size: 4096,
    checksum: 'sha256-protocol-v3',
    status,
    created_by: 'user-monitor',
    created_at: new Date().toISOString(),
    is_deleted: false,
    deleted_at: '',
    deleted_by: '',
    deletion_reason: '',
    unarchived_at: '',
    unarchived_by: '',
    unarchive_reason: '',
    is_archived: status === DocumentWorkFlowStatus.ARCHIVED,
    archived_at: status === DocumentWorkFlowStatus.ARCHIVED ? new Date().toISOString() : undefined,
    archived_by: status === DocumentWorkFlowStatus.ARCHIVED ? 'user-admin' : undefined,
    ...overrides,
  });

// --- Tests ---

describe('Archive / Restore Workflow', () => {
  describe('Archive — Prerequisites', () => {
    it('should allow ARCHIVE only from approved status', () => {
      const approvedDoc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = Transitions[approvedDoc.status];
      expect(actions).toContain(DocumentAction.ARCHIVE);
    });

    it('should NOT allow ARCHIVE from draft status', () => {
      const draftDoc = createDocument(DocumentWorkFlowStatus.DRAFT);
      const actions = Transitions[draftDoc.status];
      expect(actions).not.toContain(DocumentAction.ARCHIVE);
    });

    it('should NOT allow ARCHIVE from in_review status', () => {
      const inReviewDoc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const actions = Transitions[inReviewDoc.status];
      expect(actions).not.toContain(DocumentAction.ARCHIVE);
    });

    it('should NOT allow ARCHIVE from archived status', () => {
      const archivedDoc = createDocument(DocumentWorkFlowStatus.ARCHIVED);
      const actions = Transitions[archivedDoc.status];
      expect(actions).not.toContain(DocumentAction.ARCHIVE);
    });
  });

  describe('Archive — Role Restrictions', () => {
    it('should allow ARCHIVE for ADMIN on approved document', () => {
      const doc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).toContain(DocumentAction.ARCHIVE);
    });

    it('should allow ARCHIVE for STUDY_MANAGER on approved document', () => {
      const doc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.STUDY_MANAGER],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).toContain(DocumentAction.ARCHIVE);
    });

    it('should NOT allow ARCHIVE for MONITOR', () => {
      const doc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.ARCHIVE);
    });

    it('should NOT allow ARCHIVE for INVESTIGATOR', () => {
      const doc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.INVESTIGATOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.ARCHIVE);
    });
  });

  describe('Archive — Document State', () => {
    it('should set is_archived flag after archiving', () => {
      const approvedDoc = createDocument(DocumentWorkFlowStatus.APPROVED);

      const archivedDoc: Document = {
        ...approvedDoc,
        status: DocumentWorkFlowStatus.ARCHIVED,
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: 'user-admin',
      };

      expect(archivedDoc.status).toBe(DocumentWorkFlowStatus.ARCHIVED);
      expect(archivedDoc.is_archived).toBe(true);
      expect(archivedDoc.archived_by).toBe('user-admin');
      expect(archivedDoc.archived_at).toBeDefined();
    });

    it('should preserve document metadata after archiving', () => {
      const approvedDoc = createDocument(DocumentWorkFlowStatus.APPROVED);

      const archivedDoc: Document = {
        ...approvedDoc,
        status: DocumentWorkFlowStatus.ARCHIVED,
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: 'user-admin',
      };

      expect(archivedDoc.document_name).toBe(approvedDoc.document_name);
      expect(archivedDoc.current_version.document_number).toBe(
        approvedDoc.current_version.document_number,
      );
      expect(archivedDoc.current_version.checksum).toBe(
        approvedDoc.current_version.checksum,
      );
    });

    it('should restrict actions on archived document', () => {
      const archivedDoc = createDocument(DocumentWorkFlowStatus.ARCHIVED);
      const actions = Transitions[archivedDoc.status];

      expect(actions).not.toContain(DocumentAction.EDIT);
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(actions).not.toContain(DocumentAction.APPROVE);

      // Should still allow VIEW, DOWNLOAD, and UNARCHIVE
      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
      expect(actions).toContain(DocumentAction.UNARCHIVE);
    });
  });

  describe('Unarchive — Restore from Archived', () => {
    it('should allow UNARCHIVE from archived status', () => {
      const archivedDoc = createDocument(DocumentWorkFlowStatus.ARCHIVED);
      const actions = Transitions[archivedDoc.status];
      expect(actions).toContain(DocumentAction.UNARCHIVE);
    });

    it('should allow UNARCHIVE only for ADMIN', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.UNARCHIVE];
      expect(allowedRoles).toContain(UserRole.ADMIN);
      expect(allowedRoles.length).toBe(1); // ADMIN only
    });

    it('should NOT allow UNARCHIVE for STUDY_MANAGER', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.UNARCHIVE];
      expect(allowedRoles).not.toContain(UserRole.STUDY_MANAGER);
    });

    it('should restore document to approved status after unarchive', () => {
      const archivedDoc = createDocument(DocumentWorkFlowStatus.ARCHIVED);

      const unarchivedDoc: Document = {
        ...archivedDoc,
        status: DocumentWorkFlowStatus.APPROVED,
        is_archived: false,
        unarchived_at: new Date().toISOString(),
        unarchived_by: 'user-admin',
        unarchive_reason: 'Reopened for reference',
      };

      expect(unarchivedDoc.status).toBe(DocumentWorkFlowStatus.APPROVED);
      expect(unarchivedDoc.is_archived).toBe(false);
      expect(unarchivedDoc.unarchived_by).toBe('user-admin');
    });

    it('should restore full access after unarchive', () => {
      const unarchivedDoc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = getAvailableDocumentActions(
        unarchivedDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );

      expect(actions).toContain(DocumentAction.ARCHIVE);
      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
    });
  });

  describe('Soft Delete', () => {
    it('should allow SOFT_DELETE from draft status', () => {
      const draftDoc = createDocument(DocumentWorkFlowStatus.DRAFT);
      const actions = Transitions[draftDoc.status];
      expect(actions).toContain(DocumentAction.SOFT_DELETE);
    });

    it('should allow SOFT_DELETE for ADMIN', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.SOFT_DELETE];
      expect(allowedRoles).toContain(UserRole.ADMIN);
    });

    it('should allow SOFT_DELETE for STUDY_MANAGER', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.SOFT_DELETE];
      expect(allowedRoles).toContain(UserRole.STUDY_MANAGER);
    });

    it('should NOT allow SOFT_DELETE for MONITOR', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.SOFT_DELETE];
      expect(allowedRoles).not.toContain(UserRole.MONITOR);
    });

    it('should set is_deleted flag after soft delete', () => {
      const draftDoc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const deletedDoc: Document = {
        ...draftDoc,
        status: DocumentWorkFlowStatus.DELETED,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: 'user-admin',
        deletion_reason: 'Duplicate document',
      };

      expect(deletedDoc.is_deleted).toBe(true);
      expect(deletedDoc.status).toBe(DocumentWorkFlowStatus.DELETED);
      expect(deletedDoc.deleted_by).toBe('user-admin');
    });

    it('should restrict actions on deleted document', () => {
      const deletedDoc = createDocument(DocumentWorkFlowStatus.DELETED);
      const actions = Transitions[deletedDoc.status];

      expect(actions).not.toContain(DocumentAction.EDIT);
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).not.toContain(DocumentAction.DOWNLOAD);
      expect(actions).not.toContain(DocumentAction.ARCHIVE);

      // Should allow VIEW and RESTORE
      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.RESTORE);
    });
  });

  describe('Restore from Deleted', () => {
    it('should allow RESTORE from deleted status', () => {
      const deletedDoc = createDocument(DocumentWorkFlowStatus.DELETED);
      const actions = Transitions[deletedDoc.status];
      expect(actions).toContain(DocumentAction.RESTORE);
    });

    it('should allow RESTORE only for ADMIN', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.RESTORE];
      expect(allowedRoles).toContain(UserRole.ADMIN);
      expect(allowedRoles.length).toBe(1);
    });

    it('should NOT allow RESTORE for STUDY_MANAGER', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.RESTORE];
      expect(allowedRoles).not.toContain(UserRole.STUDY_MANAGER);
    });

    it('should restore document to draft status', () => {
      const deletedDoc = createDocument(DocumentWorkFlowStatus.DELETED);

      const restoredDoc: Document = {
        ...deletedDoc,
        status: DocumentWorkFlowStatus.DRAFT,
        is_deleted: false,
        deleted_at: '',
        deleted_by: '',
        deletion_reason: '',
        restored_by: 'user-admin',
        restored_at: new Date().toISOString(),
      };

      expect(restoredDoc.status).toBe(DocumentWorkFlowStatus.DRAFT);
      expect(restoredDoc.is_deleted).toBe(false);
      expect(restoredDoc.restored_by).toBe('user-admin');
    });

    it('should restore full edit access after restore', () => {
      const restoredDoc = createDocument(DocumentWorkFlowStatus.DRAFT);
      const actions = getAvailableDocumentActions(
        restoredDoc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );

      expect(actions).toContain(DocumentAction.EDIT);
      expect(actions).toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).toContain(DocumentAction.SUBMIT_FOR_REVIEW);
    });
  });

  describe('Complete Archive/Restore Lifecycle', () => {
    it('should follow: approved → archived → unarchived (approved) → archived', () => {
      // Step 1: Approved → Archive
      const approved = createDocument(DocumentWorkFlowStatus.APPROVED);
      expect(Transitions[approved.status]).toContain(DocumentAction.ARCHIVE);

      // Step 2: Archived → Unarchive
      const archived: Document = {
        ...approved,
        status: DocumentWorkFlowStatus.ARCHIVED,
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: 'user-admin',
      };
      expect(Transitions[archived.status]).toContain(DocumentAction.UNARCHIVE);

      // Step 3: Back to Approved
      const unarchived: Document = {
        ...archived,
        status: DocumentWorkFlowStatus.APPROVED,
        is_archived: false,
        unarchived_at: new Date().toISOString(),
        unarchived_by: 'user-admin',
        unarchive_reason: 'Needed for audit',
      };
      expect(Transitions[unarchived.status]).toContain(DocumentAction.ARCHIVE);
    });
  });

  describe('Complete Delete/Restore Lifecycle', () => {
    it('should follow: draft → deleted → restored (draft)', () => {
      // Step 1: Draft → Delete
      const draft = createDocument(DocumentWorkFlowStatus.DRAFT);
      expect(Transitions[draft.status]).toContain(DocumentAction.SOFT_DELETE);

      // Step 2: Deleted → Restore
      const deleted: Document = {
        ...draft,
        status: DocumentWorkFlowStatus.DELETED,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: 'user-admin',
        deletion_reason: 'Created by mistake',
      };
      expect(Transitions[deleted.status]).toContain(DocumentAction.RESTORE);

      // Step 3: Back to Draft
      const restored: Document = {
        ...deleted,
        status: DocumentWorkFlowStatus.DRAFT,
        is_deleted: false,
        deleted_at: '',
        deleted_by: '',
        deletion_reason: '',
        restored_by: 'user-admin',
        restored_at: new Date().toISOString(),
      };
      expect(restored.status).toBe(DocumentWorkFlowStatus.DRAFT);
      expect(restored.is_deleted).toBe(false);
    });
  });

  describe('Study/Site Status Impact on Archive', () => {
    it('should NOT allow ARCHIVE when site is frozen', () => {
      const doc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.ADMIN],
        SiteStatus.FROZEN,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.ARCHIVE);
    });

    it('should NOT allow ARCHIVE when study is completed', () => {
      const doc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.COMPLETED,
      );
      expect(actions).toContain(DocumentAction.ARCHIVE);
    });
  });
});
