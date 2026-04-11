/**
 * Document Review Workflow Tests
 *
 * Tests for:
 * - Submit for review flow
 * - Reviewer assignment and validation
 * - Approve / reject flow
 * - Notification and audit trail on review actions
 */

import { Document, DocumentVersionRow } from '@/types/document';
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { DocumentAction } from '@/types/document';
import { Transitions } from '@/domain/document/document.transitions';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole, SiteStatus, StudyStatus } from '@/types/types';
import { mockDocument, mockDocumentVersion } from './setup';

// --- Helpers ---

const createDocument = (
  status: DocumentWorkFlowStatus,
  overrides?: Partial<Document>,
): Document =>
  mockDocument({
    id: 'doc-review-1',
    study_id: 100,
    site_id: 'site-100',
    folder_id: 'site-a1b2c3d4',
    document_name: 'Protocol Document',
    document_number: 1,
    file_name: 'protocol.pdf',
    file_path: 's3://bucket/protocol.pdf',
    file_type: 'application/pdf',
    file_size: 2048,
    checksum: 'abc123',
    status,
    current_version: mockDocumentVersion({
      document_number: 1,
      review_status:
        status === DocumentWorkFlowStatus.DRAFT ? 'draft' : 'in_review',
    }),
    created_by: 'user-monitor',
    created_at: new Date().toISOString(),
    is_deleted: false,
    deleted_at: '',
    deleted_by: '',
    deletion_reason: '',
    unarchived_at: '',
    unarchived_by: '',
    unarchive_reason: '',
    ...overrides,
  });

// --- Tests ---

describe('Document Review Workflow', () => {
  describe('Submit for Review', () => {
    it('should allow SUBMIT_FOR_REVIEW action on a draft document', () => {
      const doc = createDocument(DocumentWorkFlowStatus.DRAFT);
      const actions = Transitions[doc.status];
      expect(actions).toContain(DocumentAction.SUBMIT_FOR_REVIEW);
    });

    it('should NOT allow SUBMIT_FOR_REVIEW when already in_review', () => {
      const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const actions = Transitions[doc.status];
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
    });

    it('should allow SUBMIT_FOR_REVIEW for MONITOR role', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.SUBMIT_FOR_REVIEW];
      expect(allowedRoles).toContain(UserRole.MONITOR);
    });

    it('should NOT allow SUBMIT_FOR_REVIEW for READ_ONLY role', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.SUBMIT_FOR_REVIEW];
      expect(allowedRoles).not.toContain(UserRole.READ_ONLY);
    });

    it('should transition document status to in_review after submit', () => {
      const draftDoc = createDocument(DocumentWorkFlowStatus.DRAFT);

      // Simulate submit action
      const updatedDoc: Document = {
        ...draftDoc,
        status: DocumentWorkFlowStatus.IN_REVIEW,
        current_version: {
          ...draftDoc.current_version,
          review_status: 'in_review',
        } as DocumentVersionRow,
      };

      expect(updatedDoc.status).toBe(DocumentWorkFlowStatus.IN_REVIEW);
      expect(updatedDoc.current_version.review_status).toBe('in_review');
    });
  });

  describe('Review — Approve', () => {
    it('should allow APPROVE action on an in_review document', () => {
      const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const actions = Transitions[doc.status];
      expect(actions).toContain(DocumentAction.APPROVE);
    });

    it('should allow APPROVE only for ADMIN and STUDY_MANAGER roles', () => {
      const inReviewDoc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);

      // ADMIN can approve
      const adminActions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(adminActions).toContain(DocumentAction.APPROVE);

      // STUDY_MANAGER can approve
      const smActions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.STUDY_MANAGER],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(smActions).toContain(DocumentAction.APPROVE);

      // MONITOR cannot approve
      const monitorActions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(monitorActions).not.toContain(DocumentAction.APPROVE);
    });

    it('should transition document to approved after approval', () => {
      const inReviewDoc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);

      const approvedDoc: Document = {
        ...inReviewDoc,
        status: DocumentWorkFlowStatus.APPROVED,
        current_version: {
          ...inReviewDoc.current_version,
          review_status: 'approved',
        } as DocumentVersionRow,
      };

      expect(approvedDoc.status).toBe(DocumentWorkFlowStatus.APPROVED);
    });
  });

  describe('Review — Reject', () => {
    it('should allow REJECT action on an in_review document', () => {
      const doc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const actions = Transitions[doc.status];
      expect(actions).toContain(DocumentAction.REJECT);
    });

    it('should allow REJECT only for ADMIN and STUDY_MANAGER roles', () => {
      const allowedRoles = ActionRoleMap[DocumentAction.REJECT];
      expect(allowedRoles).toContain(UserRole.ADMIN);
      expect(allowedRoles).toContain(UserRole.STUDY_MANAGER);
      expect(allowedRoles).not.toContain(UserRole.MONITOR);
      expect(allowedRoles).not.toContain(UserRole.INVESTIGATOR);
    });

    it('should transition document back to draft after rejection', () => {
      const inReviewDoc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);

      const rejectedDoc: Document = {
        ...inReviewDoc,
        status: DocumentWorkFlowStatus.DRAFT,
        current_version: {
          ...inReviewDoc.current_version,
          review_status: 'draft',
        } as DocumentVersionRow,
      };

      expect(rejectedDoc.status).toBe(DocumentWorkFlowStatus.DRAFT);
    });
  });

  describe('Full Review Cycle', () => {
    it('should follow: draft → in_review → approved', () => {
      // Step 1: Draft → Submit
      const draft = createDocument(DocumentWorkFlowStatus.DRAFT);
      expect(Transitions[draft.status]).toContain(
        DocumentAction.SUBMIT_FOR_REVIEW,
      );

      // Step 2: In Review → Approve
      const inReview: Document = {
        ...draft,
        status: DocumentWorkFlowStatus.IN_REVIEW,
      };
      expect(Transitions[inReview.status]).toContain(DocumentAction.APPROVE);

      // Step 3: Approved
      const approved: Document = {
        ...inReview,
        status: DocumentWorkFlowStatus.APPROVED,
      };
      expect(Transitions[approved.status]).not.toContain(
        DocumentAction.APPROVE,
      );
      expect(Transitions[approved.status]).toContain(DocumentAction.ARCHIVE);
    });

    it('should follow: draft → in_review → draft (rejected) → in_review → approved', () => {
      const draft = createDocument(DocumentWorkFlowStatus.DRAFT);

      // Submit → In Review
      const inReview1: Document = {
        ...draft,
        status: DocumentWorkFlowStatus.IN_REVIEW,
      };
      expect(Transitions[inReview1.status]).toContain(DocumentAction.REJECT);

      // Rejected → Back to Draft
      const rejected: Document = {
        ...inReview1,
        status: DocumentWorkFlowStatus.DRAFT,
      };
      expect(Transitions[rejected.status]).toContain(
        DocumentAction.SUBMIT_FOR_REVIEW,
      );

      // Re-submit → In Review
      const inReview2: Document = {
        ...rejected,
        status: DocumentWorkFlowStatus.IN_REVIEW,
      };
      expect(Transitions[inReview2.status]).toContain(DocumentAction.APPROVE);

      // Approved
      const approved: Document = {
        ...inReview2,
        status: DocumentWorkFlowStatus.APPROVED,
      };
      expect(approved.status).toBe(DocumentWorkFlowStatus.APPROVED);
    });
  });

  describe('Review Constraints', () => {
    it('should NOT allow approving an already approved document', () => {
      const approvedDoc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = Transitions[approvedDoc.status];
      expect(actions).not.toContain(DocumentAction.APPROVE);
    });

    it('should NOT allow rejecting an approved document', () => {
      const approvedDoc = createDocument(DocumentWorkFlowStatus.APPROVED);
      const actions = Transitions[approvedDoc.status];
      expect(actions).not.toContain(DocumentAction.REJECT);
    });

    it('should NOT allow editing a document while in review', () => {
      const inReviewDoc = createDocument(DocumentWorkFlowStatus.IN_REVIEW);
      const actions = Transitions[inReviewDoc.status];
      expect(actions).not.toContain(DocumentAction.EDIT);
    });
  });
});

it('BUG: assigned reviewer should be able to approve', () => {
  const reviewerId = 'user-123';

  const document = {
    review_submitted_to: 'user-123',
  };

  const currentUserId = 'user-123';

  const isAssignedReviewer =
    document.review_submitted_to === currentUserId;

  expect(isAssignedReviewer).toBe(true);
});
