/// <reference types="jest" />

/**
 * Test Setup - Global mocks and utilities
 */

import type { Document, DocumentVersionRow } from '@/types/document';
import { DocumentWorkFlowStatus } from '@/types/document.status';

// Mock console to reduce noise in tests
global.console = {
  ...console,
  debug: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_etmf';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-12345';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_REGION = 'us-east-1';
process.env.S3_ENDPOINT = 'https://test.s3.amazonaws.com';
process.env.YC_SERVICE_ACCOUNT_ID = 'test-service-account';

// Mock crypto for consistent test results
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    createHash: (algorithm: string) => {
      const hash = actualCrypto.createHash(algorithm);
      const originalUpdate = hash.update.bind(hash);
      hash.update = (data: any) => {
        // For testing, return predictable hash for known inputs
        if (algorithm === 'sha256' && data === 'test content') {
          hash.digest = () => 'a948904f2f0f479b8f8564cbf12dac6b0c1f30e5c5f5b3e5a5f5e5d5c5b5a594';
          return hash;
        }
        return originalUpdate(data);
      };
      return hash;
    },
    randomBytes: (size: number) => {
      // Return predictable bytes for testing
      return Buffer.alloc(size, 'test');
    },
  };
});

// Mock database pool
jest.mock('@/lib/db/index', () => ({
  getPool: () => ({
    query: jest.fn(),
  }),
}));

// Mock S3 client
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-12345'),
  compare: jest.fn().mockImplementation((password: string, hash: string) => {
    return Promise.resolve(password === 'correct-password' || hash === 'hashed-password-12345');
  }),
  genSalt: jest.fn().mockResolvedValue('salt-12345'),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-12345'),
}));

// Mock next-auth
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

// Mock logger to avoid console output in tests
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    authLog: jest.fn(),
    authError: jest.fn(),
    dbLog: jest.fn(),
    dbError: jest.fn(),
    apiLog: jest.fn(),
    apiError: jest.fn(),
    auditLog: jest.fn(),
    documentLog: jest.fn(),
  },
}));

// Mock session storage — exposed for test assertions
export const mockSessionStorage = new Map<string, any>();
jest.mock('@/lib/auth/session', () => {
  const actualSession = jest.requireActual('@/lib/auth/session');
  return {
    ...actualSession,
    createSession: jest.fn().mockImplementation((params: { userId: number; userEmail: string; refreshTokenHash: string }) => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const now = Date.now();
      const session = {
        sessionId,
        userId: params.userId,
        userEmail: params.userEmail,
        createdAt: now,
        lastActivityAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
        refreshTokenHash: params.refreshTokenHash,
        isValid: true,
      };
      mockSessionStorage.set(sessionId, session);
      return session;
    }),
    getSession: jest.fn().mockImplementation((sessionId: string) => {
      const session = mockSessionStorage.get(sessionId);
      if (!session || !session.isValid) return null;
      if (session.expiresAt < Date.now()) {
        session.isValid = false;
        return null;
      }
      const idleTimeout = 30 * 60 * 1000; // 30 minutes
      if ((Date.now() - session.lastActivityAt) > idleTimeout) {
        session.isValid = false;
        return null;
      }
      return session;
    }),
    invalidateSession: jest.fn().mockImplementation((sessionId: string) => {
      const session = mockSessionStorage.get(sessionId);
      if (session) {
        session.isValid = false;
        setTimeout(() => mockSessionStorage.delete(sessionId), 1000);
        return true;
      }
      return false;
    }),
    updateSessionActivity: jest.fn().mockImplementation((sessionId: string) => {
      const session = mockSessionStorage.get(sessionId);
      if (session && session.isValid) {
        session.lastActivityAt = Date.now();
        return true;
      }
      return false;
    }),
  };
});

// Test utilities
export const testUtils = {
  // Create a mock user
  createMockUser: (overrides?: Partial<any>) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'MONITOR',
    status: 'ACTIVE',
    study_id: 'test-study-id',
    site_id: 'test-site-id',
    ...overrides,
  }),

  // Create a mock study
  createMockStudy: (overrides?: Partial<any>) => ({
    id: 'test-study-id',
    name: 'Test Study',
    protocol_number: 'TEST-001',
    status: 'ACTIVE',
    ...overrides,
  }),

  // Create a mock site
  createMockSite: (overrides?: Partial<any>) => ({
    id: 'test-site-id',
    name: 'Test Site',
    study_id: 'test-study-id',
    status: 'ACTIVE',
    ...overrides,
  }),

  // Create a mock document
  createMockDocument: (overrides?: Partial<Document>): Document => ({
    id: 'test-document-id',
    study_id: 1,
    site_id: 'test-site-id',
    folder_id: 'test-folder-id',
    document_name: 'Test Document',
    document_number: 1,
    file_name: 'test-document.pdf',
    file_path: 's3://bucket/path/test-document.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    checksum: 'test-checksum-12345',
    tmf_zone: null,
    tmf_artifact: null,
    status: DocumentWorkFlowStatus.DRAFT,
    current_version: testUtils.createMockVersion(),
    created_by: 'test-user-id',
    created_at: new Date().toISOString(),
    is_deleted: false,
    deleted_at: '',
    deleted_by: '',
    deletion_reason: '',
    unarchived_at: '',
    unarchived_by: '',
    unarchive_reason: '',
    ...overrides,
  }),

  // Create a mock document version
  createMockVersion: (overrides?: Partial<DocumentVersionRow>): DocumentVersionRow => ({
    id: 'test-version-id',
    document_id: 'test-document-id',
    document_number: 1,
    document_name: 'Test Document',
    file_name: 'test-document.pdf',
    file_path: 's3://bucket/path/test-document.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    checksum: 'test-checksum-12345',
    uploaded_by: 'test-user-id',
    uploaded_at: new Date().toISOString(),
    change_reason: null,
    review_status: 'draft',
    ...overrides,
  }),

  // Create a mock audit event
  createMockAuditEvent: (overrides?: Partial<any>) => ({
    id: 'test-audit-id',
    user_id: 'test-user-id',
    user_email: 'test@example.com',
    action: 'CREATE',
    entity_type: 'DOCUMENT',
    entity_id: 'test-document-id',
    old_values: null,
    new_values: { name: 'Test Document' },
    ip_address: '127.0.0.1',
    user_agent: 'Jest Test',
    session_id: 'test-session-id',
    ...overrides,
  }),

  // Clear all mocks
  clearAllMocks: () => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
  },
};

// Global test utilities
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      testUtils: typeof testUtils;
    }
  }
}

(global as any).testUtils = testUtils;

// After each test cleanup
afterEach(() => {
  testUtils.clearAllMocks();
});

// Convenience exports for common mocks
export const mockDocument = testUtils.createMockDocument;
export const mockDocumentVersion = testUtils.createMockVersion;
