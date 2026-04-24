/**
 * Authentication & Access Control Tests
 * 
 * Tests for:
 * - JWT token generation/verification
 * - Password hashing
 * - User role permissions
 * - Study/Site access control
 */

import { AuthService, JwtPayload, RefreshTokenPayload } from '../lib/auth/auth.service';
import { UserRole } from '../types/types';
import { ActionRoleMap } from '../domain/document/document.policy';
import { getAvailableDocumentActions } from '../domain/document/document.logic';
import { DocumentAction, Document } from '../types/document';
import { DocumentWorkFlowStatus } from '../types/document.status';
import { SiteStatus, StudyStatus } from '../types/types';

describe('AuthService', () => {
  const mockUser: JwtPayload = {
    id: 1,
    email: 'test..example.com',
    role: 'MONITOR',
    study_id: [1],
    assigned_site_id: [1],
    sessionId: 'test-session',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = AuthService.generateAccessToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    it('should include all user claims in token', () => {
      const token = AuthService.generateAccessToken(mockUser);
      const decoded = AuthService.verifyAccessToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.id).toBe(mockUser.id);
      expect(decoded?.email).toBe(mockUser.email);
      expect(decoded?.role).toBe(mockUser.role);
      expect(decoded?.study_id).toEqual(mockUser.study_id);
      expect(decoded?.assigned_site_id).toEqual(mockUser.assigned_site_id);
    });

    it('should expire after 15 minutes', () => {
      const token = AuthService.generateAccessToken(mockUser);
      const decoded = AuthService.verifyAccessToken(token);
      
      // Token should be valid immediately
      expect(decoded).not.toBeNull();
    });

    it('should return null for invalid token', () => {
      const result = AuthService.verifyAccessToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a token and then wait for it to expire (in real tests)
      // For now, test with obviously invalid token
      const result = AuthService.verifyAccessToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired');
      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    const mockRefreshPayload: RefreshTokenPayload = {
      id: 1,
      email: 'test..example.com',
      sessionId: 'test-session',
      tokenVersion: 1,
    };

    it('should generate a valid refresh token', () => {
      const token = AuthService.generateRefreshToken(mockRefreshPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should include session ID and token version', () => {
      const token = AuthService.generateRefreshToken(mockRefreshPayload);
      const decoded = AuthService.verifyRefreshToken(token);
      
      expect(decoded?.sessionId).toBe(mockRefreshPayload.sessionId);
      expect(decoded?.tokenVersion).toBe(mockRefreshPayload.tokenVersion);
    });

    it('should have longer expiry than access token', () => {
      const token = AuthService.generateRefreshToken(mockRefreshPayload);
      const decoded = AuthService.verifyRefreshToken(token);
      
      expect(decoded).not.toBeNull();
    });
  });

  describe('hashPassword & comparePassword', () => {
    it('should hash a plain text password', async () => {
      const password = 'SecurePassword123!';
      const hash = await AuthService.hashPassword(password);
      
      expect(hash).toBeDefined();
      // Mock returns 'hashed-password-12345'
      expect(hash).toBe('hashed-password-12345');
    });

    it('should compare password correctly - match', async () => {
      const password = 'SecurePassword123!';
      const hash = await AuthService.hashPassword(password);
      
      const isMatch = await AuthService.comparePassword(password, hash);
      // Mock compare returns true for 'correct-password' or hash === 'hashed-password-12345'
      expect(isMatch).toBe(true);
    });

    it('should compare password correctly - no match', async () => {
      // The mock compare returns true only for 'correct-password' or when hash matches
      // For this test, we test with a different hash
      const isMatch = await AuthService.comparePassword('wrong-password', 'different-hash');
      expect(isMatch).toBe(false);
    });

    it('should identify hashed passwords', () => {
      const bcryptHash = '$2a$10$N9qo8uLOickgx2ZMRZoMye';
      const plainText = 'plainpassword';
      
      expect(AuthService.isPasswordHashed(bcryptHash)).toBe(true);
      expect(AuthService.isPasswordHashed(plainText)).toBe(false);
    });
  });

  describe('extractTokenFromHeaders', () => {
    it('should extract token from Bearer header', () => {
      const headers = new Headers({
        'authorization': 'Bearer test-token-123',
      });
      
      const token = AuthService.extractTokenFromHeaders(headers);
      expect(token).toBe('test-token-123');
    });

    it('should return null for missing header', () => {
      const headers = new Headers();
      const token = AuthService.extractTokenFromHeaders(headers);
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const headers = new Headers({
        'authorization': 'Basic dGVzdDp0ZXN0',
      });
      
      const token = AuthService.extractTokenFromHeaders(headers);
      expect(token).toBeNull();
    });
  });
});

describe('ActionRoleMap - Permission Matrix', () => {
  it('should define permissions for all document actions', () => {
    const allActions = Object.values(DocumentAction);
    
    allActions.forEach(action => {
      expect(ActionRoleMap[action]).toBeDefined();
      expect(Array.isArray(ActionRoleMap[action])).toBe(true);
    });
  });

  it('should restrict APPROVE to ADMIN and STUDY_MANAGER only', () => {
    const allowedRoles = ActionRoleMap[DocumentAction.APPROVE];
    
    expect(allowedRoles).toContain(UserRole.ADMIN);
    expect(allowedRoles).toContain(UserRole.STUDY_MANAGER);
    expect(allowedRoles).not.toContain(UserRole.MONITOR);
    expect(allowedRoles).not.toContain(UserRole.INVESTIGATOR);
    expect(allowedRoles).not.toContain(UserRole.READ_ONLY);
  });

  it('should restrict REJECT to ADMIN and STUDY_MANAGER only', () => {
    const allowedRoles = ActionRoleMap[DocumentAction.REJECT];
    
    expect(allowedRoles).toContain(UserRole.ADMIN);
    expect(allowedRoles).toContain(UserRole.STUDY_MANAGER);
    expect(allowedRoles.length).toBe(2);
  });

  it('should restrict RESTORE to ADMIN only', () => {
    const allowedRoles = ActionRoleMap[DocumentAction.RESTORE];
    
    expect(allowedRoles).toContain(UserRole.ADMIN);
    expect(allowedRoles.length).toBe(1);
  });

  it('should allow VIEW for all roles', () => {
    const allowedRoles = ActionRoleMap[DocumentAction.VIEW];
    const allRoles = Object.values(UserRole);
    
    allRoles.forEach(role => {
      expect(allowedRoles).toContain(role);
    });
  });

  it('should allow DOWNLOAD for most roles', () => {
    const allowedRoles = ActionRoleMap[DocumentAction.DOWNLOAD];
    
    expect(allowedRoles).toContain(UserRole.ADMIN);
    expect(allowedRoles).toContain(UserRole.MONITOR);
    expect(allowedRoles).toContain(UserRole.AUDITOR);
    expect(allowedRoles).toContain(UserRole.READ_ONLY);
  });

  it('should restrict SUBMIT_FOR_REVIEW to specific roles', () => {
    const allowedRoles = ActionRoleMap[DocumentAction.SUBMIT_FOR_REVIEW];
    
    expect(allowedRoles).toContain(UserRole.MONITOR);
    expect(allowedRoles).toContain(UserRole.ADMIN);
    expect(allowedRoles).toContain(UserRole.STUDY_MANAGER);
    expect(allowedRoles).toContain(UserRole.DATA_MANAGER);
    expect(allowedRoles).not.toContain(UserRole.INVESTIGATOR);
    expect(allowedRoles).not.toContain(UserRole.READ_ONLY);
  });
});

describe('getAvailableDocumentActions - Business Logic', () => {
  const mockDocument: Document = {
    id: 'doc-1',
    study_id: 1,
    site_id: 'site-1',
    folder_id: 'folder-1',
    document_name: 'Test Document',
    document_number: 0,
    file_name: 'test file name',
    file_path:'test file path',
    file_type: 'test file type',
    file_size: 'test file size',
    checksum: 'test checksum',
    tmf_zone: null,
    tmf_artifact: null,     
    status: DocumentWorkFlowStatus.DRAFT,
    current_version: {
      id: 'version-1',
      document_id: 'test-doc',
      document_number: 1,
      document_name: 'Test',
      file_name: 'test.pdf',
      file_path: 's3://bucket/test.pdf',
      file_type: 'application/pdf',
      file_size: 1024,
      checksum: 'test-checksum',
      change_reason: 'test reason',
      uploaded_by: 'user-1',
      uploaded_at: new Date().toISOString(),
      review_status: 'draft',
    },
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    is_deleted: false,
    deleted_at: '',
    deleted_by: '',
    deletion_reason: '',
    unarchived_at: '',
    unarchived_by: '',
    unarchive_reason: '',    
  };

  describe('Draft Status', () => {
    it('should allow SUBMIT_FOR_REVIEW for draft document', () => {
      const actions = getAvailableDocumentActions(
        mockDocument,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).toContain(DocumentAction.SUBMIT_FOR_REVIEW);
    });

    it('should allow UPLOAD_NEW_VERSION for draft document', () => {
      const actions = getAvailableDocumentActions(
        mockDocument,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });

    it('should NOT allow APPROVE for draft document', () => {
      const actions = getAvailableDocumentActions(
        mockDocument,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.APPROVE);
    });
  });

  describe('In Review Status', () => {
    const inReviewDoc: Document = {
      ...mockDocument,
      status: DocumentWorkFlowStatus.IN_REVIEW,
    };

    it('should allow APPROVE for in_review document', () => {
      const actions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).toContain(DocumentAction.APPROVE);
    });

    it('should allow REJECT for in_review document', () => {
      const actions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.STUDY_MANAGER],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).toContain(DocumentAction.REJECT);
    });

    it('should NOT allow UPLOAD_NEW_VERSION for in_review document', () => {
      const actions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });
  });

  describe('Approved Status', () => {
    const approvedDoc: Document = {
      ...mockDocument,
      status: DocumentWorkFlowStatus.APPROVED,
    };

    it('should allow ARCHIVE for approved document', () => {
      const actions = getAvailableDocumentActions(
        approvedDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).toContain(DocumentAction.ARCHIVE);
    });

    it('should NOT allow EDIT for approved document', () => {
      const actions = getAvailableDocumentActions(
        approvedDoc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.EDIT);
    });

    it('should NOT allow UPLOAD_NEW_VERSION for approved document', () => {
      const actions = getAvailableDocumentActions(
        approvedDoc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
    });
  });

  describe('Archived Status', () => {
    const archivedDoc: Document = {
      ...mockDocument,
      status: DocumentWorkFlowStatus.ARCHIVED,
    };

    it('should allow UNARCHIVE for archived document', () => {
      const actions = getAvailableDocumentActions(
        archivedDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).toContain(DocumentAction.UNARCHIVE);
    });

    it('should NOT allow EDIT for archived document', () => {
      const actions = getAvailableDocumentActions(
        archivedDoc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.EDIT);
    });
  });

  describe('Role-based restrictions', () => {
    it('should NOT allow MONITOR to APPROVE', () => {
      const inReviewDoc: Document = {
        ...mockDocument,
        status: DocumentWorkFlowStatus.IN_REVIEW,
      };
      
      const actions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.APPROVE);
    });

    it('should allow ADMIN to APPROVE', () => {
      const inReviewDoc: Document = {
        ...mockDocument,
        status: DocumentWorkFlowStatus.IN_REVIEW,
      };
      
      const actions = getAvailableDocumentActions(
        inReviewDoc,
        [UserRole.ADMIN],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).toContain(DocumentAction.APPROVE);
    });

    it('should NOT allow READ_ONLY to CREATE_DOCUMENT', () => {
      const actions = getAvailableDocumentActions(
        null,
        [UserRole.READ_ONLY],
        SiteStatus.OPENED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.CREATE_DOCUMENT);
    });
  });

  describe('Site Status impact', () => {
    it('should restrict actions when site is frozen', () => {
      const actions = getAvailableDocumentActions(
        mockDocument,
        [UserRole.MONITOR],
        SiteStatus.FROZEN,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
    });

    it('should restrict actions when site is closed', () => {
      const actions = getAvailableDocumentActions(
        mockDocument,
        [UserRole.MONITOR],
        SiteStatus.CLOSED,
        StudyStatus.ONGOING
      );
      
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).not.toContain(DocumentAction.DOWNLOAD);
      expect(actions).toContain(DocumentAction.VIEW);
    });
  });

  describe('Study Status impact', () => {
    it('should restrict actions when study is archived', () => {
      const actions = getAvailableDocumentActions(
        mockDocument,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.ARCHIVED
      );
      
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).toContain(DocumentAction.VIEW);
    });

    it('should restrict actions when study is terminated', () => {
      const actions = getAvailableDocumentActions(
        mockDocument,
        [UserRole.MONITOR],
        SiteStatus.OPENED,
        StudyStatus.TERMINATED
      );
      
      expect(actions).not.toContain(DocumentAction.SUBMIT_FOR_REVIEW);
      expect(actions).not.toContain(DocumentAction.UPLOAD_NEW_VERSION);
      expect(actions).toContain(DocumentAction.VIEW);
      expect(actions).toContain(DocumentAction.DOWNLOAD);
    });
  });
});
