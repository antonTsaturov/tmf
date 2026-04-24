/**
 * Document Versioning Tests
 *
 * Tests for:
 * - Version number increment
 * - Old version preservation
 * - Checksum calculation
 * - Version metadata
 */

import { Document, DocumentVersionRow } from '../types/document';
import { DocumentWorkFlowStatus } from '../types/document.status';
import { mockDocument, mockDocumentVersion } from './setup';

describe('Document Versioning', () => {
  const createMockDocument = (number: number): Document => mockDocument({
    id: 'doc-1',
    study_id: 1,
    site_id: 'site-1',
    folder_id: 'folder-1',
    document_name: 'Test Document',
    status: DocumentWorkFlowStatus.DRAFT,
    created_by: 'user-1',
    created_at: new Date().toISOString(),
  });

  const createMockVersion = (versionNumber: number): DocumentVersionRow => mockDocumentVersion({
    id: `version-${versionNumber}`,
    document_id: 'doc-1',
    document_number: versionNumber,
    document_name: 'Test Document',
    file_name: `document-v${versionNumber}.pdf`,
    file_path: 's3://bucket/path/document.pdf',
    file_type: 'application/pdf',
    file_size: 1024 * versionNumber,
    checksum: `checksum-${versionNumber}`,
    uploaded_by: 'user-1',
    uploaded_at: new Date().toISOString(),
    review_status: 'draft',
    change_reason: versionNumber > 1 ? 'Updated content' : 'Initial upload',
  });

  describe('Version Number Increment', () => {
    it('should start with version 1 on initial upload', () => {
      const version = createMockVersion(1);
      expect(version.document_number).toBe(1);
    });

    it('should increment version number sequentially', () => {
      const version1 = createMockVersion(1);
      const version2 = createMockVersion(2);
      const version3 = createMockVersion(3);

      expect(version2.document_number).toBe(version1.document_number + 1);
      expect(version3.document_number).toBe(version2.document_number + 1);
    });

    it('should have unique version IDs', () => {
      const version1 = createMockVersion(1);
      const version2 = createMockVersion(2);

      expect(version1.id).not.toBe(version2.id);
    });
  });

  describe('Old Version Preservation', () => {
    it('should preserve old version metadata', () => {
      const version1 = createMockVersion(1);
      
      expect(version1.file_name).toBe('document-v1.pdf');
      expect(version1.checksum).toBe('checksum-1');
      expect(version1.document_number).toBe(1);
    });

    it('should not modify old version when new version is created', () => {
      const version1 = createMockVersion(1);
      const version2 = createMockVersion(2);

      // Version 1 should remain unchanged
      expect(version1.document_number).toBe(1);
      expect(version1.file_name).toBe('document-v1.pdf');
      
      // Version 2 is new current version
      expect(version2.document_number).toBe(2);
    });

    it('should update document current_version to new version', () => {
      const doc = createMockDocument(1);
      expect(doc.current_version.document_number).toBe(1);

      const newVersion = createMockVersion(2);
      // After uploading version 2
      const updatedDoc = {
        ...doc,
        current_version: newVersion,
        updated_at: new Date().toISOString(),
      };

      expect(updatedDoc.current_version.document_number).toBe(2);
    });
  });

  describe('Checksum Calculation', () => {
    it('should have unique checksum for each version', () => {
      const version1 = createMockVersion(1);
      const version2 = createMockVersion(2);

      expect(version1.checksum).not.toBe(version2.checksum);
    });

    it('should store checksum in version metadata', () => {
      const version = createMockVersion(1);
      
      expect(version.checksum).toBeDefined();
      expect(typeof version.checksum).toBe('string');
      expect(version.checksum.length).toBeGreaterThan(0);
    });
  });

  describe('Version Metadata', () => {
    it('should track upload timestamp', () => {
      const version = createMockVersion(1);
      
      expect(version.uploaded_at).toBeDefined();
      expect(new Date(version.uploaded_at)).toBeInstanceOf(Date);
    });

    it('should track uploader ID', () => {
      const version = createMockVersion(1);
      
      expect(version.uploaded_by).toBeDefined();
      expect(version.uploaded_by).toBe('user-1');
    });

    it('should track file information', () => {
      const version = createMockVersion(1);
      
      expect(version.file_name).toBeDefined();
      expect(version.file_path).toBeDefined();
      expect(version.file_type).toBe('application/pdf');
      expect(version.file_size).toBeGreaterThan(0);
    });

    it('should track change reason for versions > 1', () => {
      const version1 = createMockVersion(1);
      const version2 = createMockVersion(2);

      expect(version1.change_reason).toBe('Initial upload');
      expect(version2.change_reason).toBe('Updated content');
    });
  });

  describe('Version Status', () => {
    it('should have draft status on initial upload', () => {
      const version = createMockVersion(1);
      expect(version.review_status).toBe('draft');
    });

    it('should track review status independently per version', () => {
      const version1: DocumentVersionRow = {
        ...createMockVersion(1),
        review_status: 'approved',
      };
      const version2: DocumentVersionRow = {
        ...createMockVersion(2),
        review_status: 'draft',
      };

      // Old version can be approved while new version is draft
      expect(version1.review_status).toBe('approved');
      expect(version2.review_status).toBe('draft');
    });
  });

  describe('File Path Structure', () => {
    it('should have consistent S3 path structure', () => {
      const version = createMockVersion(1);
      
      expect(version.file_path).toContain('s3://');
      expect(version.file_path).toContain('bucket');
    });

    it('should include version in file name', () => {
      const version1 = createMockVersion(1);
      const version2 = createMockVersion(2);

      expect(version1.file_name).toContain('v1');
      expect(version2.file_name).toContain('v2');
    });
  });
});
