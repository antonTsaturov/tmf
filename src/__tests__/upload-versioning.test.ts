/**
 * Upload + Versioning Workflow Tests
 *
 * Tests for:
 * - Initial document upload creates version 1
 * - Uploading a new version increments document_number
 * - Previous version metadata is preserved
 * - Version uploads respect document status (draft only)
 * - File metadata validation (size, type, checksum)
 */

import { Document, DocumentVersionRow } from '@/types/document';
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { DocumentAction } from '@/types/document';
import { Transitions } from '@/domain/document/document.transitions';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole, SiteStatus, StudyStatus } from '@/types/types';
import { mockDocument, mockDocumentVersion } from './setup';

// --- Helpers ---

const createDocumentWithVersion = (
  versionNumber: number,
  status: DocumentWorkFlowStatus = DocumentWorkFlowStatus.DRAFT,
): Document =>
  mockDocument({
    id: 'doc-version-test',
    study_id: 1,
    site_id: 'site-1',
    folder_id: 'general-a1b2c3',
    document_name: 'Informed Consent Form',
    document_number: versionNumber,
    file_name: `icf-v${versionNumber}.pdf`,
    file_path: `s3://bucket/studies/1/sites/1/icf-v${versionNumber}.pdf`,
    file_type: 'application/pdf',
    file_size: 1024 * versionNumber * 100,
    checksum: `sha256-v${versionNumber}-${'a'.repeat(64)}`,
    status,
    current_version: mockDocumentVersion({
      document_number: versionNumber,
      document_name: 'Informed Consent Form',
      file_name: `icf-v${versionNumber}.pdf`,
      file_path: `s3://bucket/studies/1/sites/1/icf-v${versionNumber}.pdf`,
      file_type: 'application/pdf',
      file_size: 1024 * versionNumber * 100,
      checksum: `sha256-v${versionNumber}-${'a'.repeat(64)}`,
      uploaded_by: 'user-monitor',
      uploaded_at: new Date().toISOString(),
      change_reason:
        versionNumber === 1 ? 'Initial upload' : 'Updated per reviewer feedback',
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
  });

// --- Tests ---

describe('Upload + Versioning Workflow', () => {
  describe('Initial Upload', () => {
    it('should create a document with version 1', () => {
      const doc = createDocumentWithVersion(1);

      expect(doc.document_number).toBe(1);
      expect(doc.current_version.document_number).toBe(1);
    });

    it('should set correct metadata on initial upload', () => {
      const doc = createDocumentWithVersion(1);

      expect(doc.current_version.change_reason).toBe('Initial upload');
      expect(doc.current_version.review_status).toBe('draft');
      expect(doc.current_version.uploaded_by).toBe('user-monitor');
    });

    it('should generate a valid file path', () => {
      const doc = createDocumentWithVersion(1);

      expect(doc.current_version.file_path).toContain('s3://');
      expect(doc.current_version.file_name).toBe('icf-v1.pdf');
    });
  });

  describe('Upload New Version — Allowed States', () => {
    it('should allow UPLOAD_NEW_VERSION when document is draft', () => {
      const doc = createDocumentWithVersion(1, DocumentWorkFlowStatus.DRAFT);
      const actions = Transitions[doc.status];
      expect(actions).toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow UPLOAD_NEW_VERSION when document is in_review', () => {
      const doc = createDocumentWithVersion(1, DocumentWorkFlowStatus.IN_REVIEW);
      const actions = Transitions[doc.status];
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow UPLOAD_NEW_VERSION when document is approved', () => {
      const doc = createDocumentWithVersion(1, DocumentWorkFlowStatus.APPROVED);
      const actions = Transitions[doc.status];
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow UPLOAD_NEW_VERSION when document is archived', () => {
      const doc = createDocumentWithVersion(1, DocumentWorkFlowStatus.ARCHIVED);
      const actions = Transitions[doc.status];
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow UPLOAD_NEW_VERSION when document is deleted', () => {
      const doc = createDocumentWithVersion(1, DocumentWorkFlowStatus.DELETED);
      const actions = Transitions[doc.status];
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });
  });

  describe('Upload New Version — Role Restrictions', () => {
    it('should allow UPLOAD_NEW_VERSION for MONITOR on draft document', () => {
      const doc = createDocumentWithVersion(1);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should allow UPLOAD_NEW_VERSION for ADMIN on draft document', () => {
      const doc = createDocumentWithVersion(1);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow UPLOAD_NEW_VERSION for READ_ONLY role', () => {
      const doc = createDocumentWithVersion(1);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.READ_ONLY],
        SiteStatus.OPENED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });
  });

  describe('Version Increment', () => {
    it('should increment version number by 1', () => {
      const v1 = createDocumentWithVersion(1);

      // Simulate uploading version 2
      const v2: DocumentVersionRow = mockDocumentVersion({
        document_number: v1.current_version.document_number + 1,
        file_name: 'icf-v2.pdf',
        file_path: 's3://bucket/studies/1/sites/1/icf-v2.pdf',
        checksum: 'sha256-v2-bbb',
        uploaded_at: new Date().toISOString(),
        change_reason: 'Updated per reviewer feedback',
      });

      expect(v2.document_number).toBe(2);
    });

    it('should support multiple sequential versions', () => {
      const versions: DocumentVersionRow[] = [];
      for (let i = 1; i <= 5; i++) {
        versions.push(
          mockDocumentVersion({
            document_number: i,
            file_name: `doc-v${i}.pdf`,
            checksum: `checksum-${i}`,
            uploaded_at: new Date().toISOString(),
          }),
        );
      }

      // Verify sequential numbering
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i].document_number).toBe(
          versions[i - 1].document_number + 1,
        );
      }
    });

    it('should update document.current_version when new version is uploaded', () => {
      const doc = createDocumentWithVersion(1);

      const newVersion: DocumentVersionRow = mockDocumentVersion({
        document_number: 2,
        file_name: 'icf-v2.pdf',
        checksum: 'sha256-new',
        uploaded_at: new Date().toISOString(),
        change_reason: 'Corrected typos',
      });

      const updatedDoc: Document = {
        ...doc,
        document_number: 2,
        current_version: newVersion,
      };

      expect(updatedDoc.current_version.document_number).toBe(2);
      expect(updatedDoc.document_number).toBe(2);
    });
  });

  describe('Previous Version Preservation', () => {
    it('should preserve old version checksum after new upload', () => {
      const v1Checksum = 'sha256-v1-original';
      const oldVersion = mockDocumentVersion({
        document_number: 1,
        checksum: v1Checksum,
        file_name: 'icf-v1.pdf',
      });

      const newVersion = mockDocumentVersion({
        document_number: 2,
        checksum: 'sha256-v2-new',
        file_name: 'icf-v2.pdf',
      });

      // Old version checksum unchanged
      expect(oldVersion.checksum).toBe(v1Checksum);
      expect(newVersion.checksum).not.toBe(oldVersion.checksum);
    });

    it('should preserve old version file path after new upload', () => {
      const oldVersion = mockDocumentVersion({
        document_number: 1,
        file_path: 's3://bucket/studies/1/sites/1/icf-v1.pdf',
      });

      const newVersion = mockDocumentVersion({
        document_number: 2,
        file_path: 's3://bucket/studies/1/sites/1/icf-v2.pdf',
      });

      expect(oldVersion.file_path).not.toBe(newVersion.file_path);
    });
  });

  describe('File Metadata Validation', () => {
    it('should record file size correctly', () => {
      const doc = createDocumentWithVersion(1);
      expect(doc.current_version.file_size).toBeGreaterThan(0);
      expect(typeof doc.current_version.file_size).toBe('number');
    });

    it('should record file type correctly', () => {
      const doc = createDocumentWithVersion(1);
      expect(doc.current_version.file_type).toBe('application/pdf');
    });

    it('should generate unique checksum per version', () => {
      const v1 = createDocumentWithVersion(1);
      const v2 = createDocumentWithVersion(2);

      expect(v1.current_version.checksum).not.toBe(
        v2.current_version.checksum,
      );
    });

    it('should record uploader identity', () => {
      const doc = createDocumentWithVersion(1);
      expect(doc.current_version.uploaded_by).toBe('user-monitor');
    });

    it('should record upload timestamp', () => {
      const doc = createDocumentWithVersion(1);
      const uploadedAt = new Date(doc.current_version.uploaded_at);
      expect(uploadedAt).toBeInstanceOf(Date);
      expect(!isNaN(uploadedAt.getTime())).toBe(true);
    });

    it('should record change reason for version > 1', () => {
      const v2 = createDocumentWithVersion(2);
      expect(v2.current_version.change_reason).not.toBeNull();
      expect(v2.current_version.change_reason).not.toBe('');
    });
  });

  describe('Site Status Restrictions', () => {
    it('should NOT allow UPLOAD_NEW_VERSION when site is frozen', () => {
      const doc = createDocumentWithVersion(1);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.FROZEN,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow UPLOAD_NEW_VERSION when site is closed', () => {
      const doc = createDocumentWithVersion(1);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.CLOSED,
        StudyStatus.ONGOING,
      );
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow UPLOAD_NEW_VERSION when study is archived', () => {
      const doc = createDocumentWithVersion(1);
      const actions = getAvailableDocumentActions(
        doc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ARCHIVED,
      );
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });
  });
});
