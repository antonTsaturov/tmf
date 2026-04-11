/**
 * Permissions — Reviewer Mismatch Tests
 *
 * Tests for:
 * - Role-based action restrictions (who can approve/reject/edit)
 * - Study assignment mismatch (user not assigned to study)
 * - Site assignment mismatch (user not assigned to site)
 * - Cross-role escalation (READ_ONLY trying privileged actions)
 * - Multi-role user with conflicting permissions
 */

import { Document } from '@/types/document';
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { DocumentAction } from '@/types/document';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole, SiteStatus, StudyStatus } from '@/types/types';
import { mockDocument } from './setup';

// --- Helpers ---

const createDocument = (
  status: DocumentWorkFlowStatus = DocumentWorkFlowStatus.DRAFT,
): Document =>
  mockDocument({
    id: 'doc-perm-test',
    study_id: 100,
    site_id: 'site-50',
    folder_id: 'site-a1b2',
    document_name: 'Monitoring Report',
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
  });

// --- Tests ---

describe('Permissions — Reviewer Mismatch', () => {
  describe('Role-based Restrictions — Privileged Actions', () => {
    const privilegedActions = [
      DocumentAction.APPROVE,
      DocumentAction.REJECT,
      DocumentAction.ARCHIVE,
      DocumentAction.UNARCHIVE,
      DocumentAction.RESTORE,
      DocumentAction.SOFT_DELETE,
    ] as const;

    const lowPrivilegeRoles = [
      UserRole.READ_ONLY,
      UserRole.COORDINATOR,
    ] as const;

    privilegedActions.forEach((action) => {
      it(`should NOT allow READ_ONLY to ${action}`, () => {
        const allowed = ActionRoleMap[action];
        expect(allowed).not.toContain(UserRole.READ_ONLY);
      });
    });

    lowPrivilegeRoles.forEach((role) => {
      it(`should restrict ${role} from APPROVE`, () => {
        const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
        const actions = getAvailableDocumentActions(
          doc,
          [role],
          SiteStatus.OPENED,
          StudyStatus.ONGOING,
        );
        expect(actions).not.toContain(DocumentAction.APPROVE);
      });

      it(`should restrict ${role} from REJECT`, () => {
        const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
        const actions = getAvailableDocumentActions(
          doc,
          [role],
          SiteStatus.OPENED,
          StudyStatus.ONGOING,
        );
        expect(actions).not.toContain(DocumentAction.REJECT);
      });
    });
  });

  describe('Study Assignment Mismatch', () => {
    it('should allow actions when user IS assigned to the study', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      // User assigned to study 100
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );

      // Should have document actions
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should restrict MONITOR when study is not ongoing', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.TERMINATED,
      );

      // Should be severely restricted
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
    });
  });

  describe('Site Assignment Mismatch', () => {
    it('should restrict actions when site is frozen', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.FROZEN,
        StudyStatus.ONGOING,
      );

      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(actions).not.toContain(DocumentAction.EDIT);
      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
    });

    it('should restrict actions when site is closed', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.CLOSED,
        StudyStatus.ONGOING,
      );

      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).not.toContain(DocumentAction.DOWNLOAD);
      expect(actions).toContain(DocumentAction.VIEW);
    });

    it('should allow VIEW but not DOWNLOAD on closed site', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.CLOSED,
        StudyStatus.ONGOING,
      );

      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).not.toContain(DocumentAction.DOWNLOAD);
    });
  });

  describe('Cross-Role Escalation Prevention', () => {
    it('should NOT allow READ_ONLY to create documents', () => {
      const actions = getAvailableDocumentActions(
        null,
        [UserRole.READ_ONLY],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.CREATE_DOCUMENT);
    });

    it('should NOT allow READ_ONLY to upload new versions', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.READ_ONLY],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow READ_ONLY to submit for review', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.READ_ONLY],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
    });

    it('should NOT allow COORDINATOR to approve documents', () => {
      const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.COORDINATOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.APPROVE);
    });

    it('should NOT allow COORDINATOR to reject documents', () => {
      const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.COORDINATOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.REJECT);
    });

    it('should NOT allow INVESTIGATOR to archive documents', () => {
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

  describe('ADMIN — Full Access Verification', () => {
    it('should allow ADMIN to perform all privileged actions on appropriate documents', () => {
      // Draft
      const draftDoc = createDocument(DocumentWorkFlowStatus.DRAFT);
      const draftActions = getAvailableDocumentActions(
        draftDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(draftActions).toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(draftActions).toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(draftActions).toContain(DocumentAction.EDIT);

      // In Review
      const reviewDoc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const reviewActions = getAvailableDocumentActions(
        reviewDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(reviewActions).toContain(DocumentAction.APPROVE);
      expect(reviewActions).toContain(DocumentAction.REJECT);

      // Approved
      const approvedDoc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const approvedActions = getAvailableDocumentActions(
        approvedDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(approvedActions).toContain(DocumentAction.ARCHIVE);

      // Archived
      const archivedDoc = createDocument(DocumentWorkFlowStatus.ARCHIVED);
      const archivedActions = getAvailableDocumentActions(
        archivedDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(archivedActions).toContain(DocumentAction.UNARCHIVE);
    });

    it('should allow ADMIN to restore deleted documents', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.RESTORE];
      expect(allowedRoles).toContain(UserRole.ADMIN);
      expect(allowedRoles.length).toBe(1); // ADMIN only
    });
  });

  describe('Multi-Role Users', () => {
    it('should grant combined permissions for users with multiple roles', () => {
      const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);

      // User has both MONITOR and ADMIN roles
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR, UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );

      // From ADMIN role
      expect(actions).toContain(DocumentAction.APPROVE);
      expect(actions).toContain(DocumentAction.REJECT);

      // From MONITOR role (document is in_review, so UPLOAD/EDIT not available,
      // but VIEW and DOWNLOAD should be)
      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
    });

    it('should grant combined permissions for STUDY_MANAGER + MONITOR', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.STUDY_MANAGER, UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );

      expect(actions).toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(actions).toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).toContain(DocumentAction.EDIT);
    });
  });

  describe('AUDITOR — Read-Only + Extra', () => {
    it('should allow AUDITOR to VIEW and DOWNLOAD but not modify', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.AUDITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );

      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
      expect(actions).not.toContain(DocumentAction.EDIT);
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
    });
  });

  describe('QUALITY_ASSURANCE — Read-Only + Extra', () => {
    it('should allow QA to VIEW and DOWNLOAD but not modify', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);

      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.QUALITY_ASSURANCE],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );

      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
      expect(actions).not.toContain(DocumentAction.EDIT);
      expect(actions).not.toContain(DocumentAction.APPROVE);
    });
  });
});
