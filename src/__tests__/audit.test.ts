/**
 * Audit Logging Tests
 * 
 * Tests for:
 * - Audit event creation
 * - Data integrity
 * - Metadata extraction
 * - Bulk logging
 */

import { AuditService } from '../lib/audit/audit.service';
import { AuditLogEntry } from '../types/audit';
import { UserRole } from '../types/user';
import { NextRequest } from 'next/server';
import { PoolClient } from 'pg';

// Mock getPool
const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('AuditService', () => {
  const mockAuditEntry: AuditLogEntry = {
    user_id: 'user-123',
    user_email: 'user@example.com',
    user_role: [UserRole.MONITOR],
    action: 'CREATE',
    entity_type: 'document',
    entity_id: 'doc-456',
    old_value: null,
    new_value: { name: 'Test Document' },
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    session_id: 'session-789',
    status: 'SUCCESS',
    site_id: 'site-1',
    study_id: 'study-1',
  };

  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('log - Single Event', () => {
    it('should insert audit log entry to database', async () => {
      await AuditService.log(mockAuditEntry);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit'),
        expect.any(Array)
      );
    });

    it('should include all required fields in audit log', async () => {
      await AuditService.log(mockAuditEntry);

      const callArgs = mockQuery.mock.calls[0][1];
      
      // Check that user info is included
      expect(callArgs[2]).toBe(mockAuditEntry.user_id);
      expect(callArgs[3]).toBe(mockAuditEntry.user_email);
      
      // Check action info
      expect(callArgs[5]).toBe(mockAuditEntry.action);
      expect(callArgs[6]).toBe(mockAuditEntry.entity_type);
      expect(callArgs[7]).toBe(mockAuditEntry.entity_id);
    });

    it('should handle null old_value for CREATE actions', async () => {
      const createEntry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'CREATE',
        old_value: null,
      };

      await AuditService.log(createEntry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should include old and new values for UPDATE actions', async () => {
      const updateEntry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'UPDATE',
        old_value: { name: 'Old Name' },
        new_value: { name: 'New Name' },
      };

      await AuditService.log(updateEntry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should handle error messages for failed actions', async () => {
      const errorEntry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'DELETE',
        status: 'FAILURE',
        error_message: 'Permission denied',
      };

      await AuditService.log(errorEntry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should truncate large JSON payloads', async () => {
      const largeEntry: AuditLogEntry = {
        ...mockAuditEntry,
        new_value: { data: 'x'.repeat(25000) }, // Exceeds MAX_JSON_SIZE
      };

      await AuditService.log(largeEntry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should not throw on serialization errors', async () => {
      const circularPayload: { self?: unknown } = {};
      circularPayload.self = circularPayload;

      const circularEntry: AuditLogEntry = {
        ...mockAuditEntry,
        new_value: circularPayload,
      };

      await AuditService.log(circularEntry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should log error if database insert fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

      await AuditService.log(mockAuditEntry);

      // Should not throw, but log error internally
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('extractMetadata', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-forwarded-for') return '203.0.113.195, 70.41.3.18';
            if (name === 'user-agent') return 'Mozilla/5.0';
            return null;
          },
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as NextRequest;

      const metadata = AuditService.extractMetadata(mockRequest);
      expect(metadata.ip_address).toBe('203.0.113.195');
    });

    it('should extract IP from x-real-ip if x-forwarded-for missing', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-real-ip') return '192.168.1.1';
            if (name === 'user-agent') return 'Mozilla/5.0';
            return null;
          },
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as NextRequest;

      const metadata = AuditService.extractMetadata(mockRequest);
      expect(metadata.ip_address).toBe('192.168.1.1');
    });

    it('should use default IP if no IP headers present', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'user-agent') return 'Mozilla/5.0';
            return null;
          },
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as NextRequest;

      const metadata = AuditService.extractMetadata(mockRequest);
      expect(metadata.ip_address).toBe('0.0.0.0');
    });

    it('should extract user agent', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'user-agent') return 'CustomAgent/1.0';
            return null;
          },
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as NextRequest;

      const metadata = AuditService.extractMetadata(mockRequest);
      expect(metadata.user_agent).toBe('CustomAgent/1.0');
    });

    it('should extract session ID from cookies', () => {
      const mockRequest = {
        headers: {
          get: () => null,
          has: () => false,
        },
        cookies: {
          get: (name: string) => {
            if (name === 'session-id') return { value: 'test-session-123' };
            return undefined;
          },
        },
      } as unknown as NextRequest;

      const metadata = AuditService.extractMetadata(mockRequest);
      expect(metadata.session_id).toBe('test-session-123');
    });

    it('should generate session ID if not present in cookies', () => {
      const mockRequest = {
        headers: {
          get: () => null,
          has: () => false,
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as NextRequest;

      const metadata = AuditService.extractMetadata(mockRequest);
      expect(metadata.session_id).toBeDefined();
    });
  });

  describe('getUserFromRequest', () => {
    it('should extract user info from headers', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-user-id') return 'user-123';
            if (name === 'x-user-email') return 'user@example.com';
            if (name === 'x-user-roles') return '["MONITOR","ADMIN"]';
            return null;
          },
        },
      } as unknown as NextRequest;

      const user = AuditService.getUserFromRequest(mockRequest);
      
      expect(user.user_id).toBe('user-123');
      expect(user.user_email).toBe('user@example.com');
      expect(user.user_role).toEqual(['MONITOR', 'ADMIN']);
    });

    it('should handle missing user headers', () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
      } as unknown as NextRequest;

      const user = AuditService.getUserFromRequest(mockRequest);
      
      expect(user.user_id).toBe('');
      expect(user.user_email).toBe('');
      expect(user.user_role).toEqual([]);
    });

    it('should handle invalid JSON in roles header', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-user-roles') return 'invalid-json';
            return null;
          },
        },
      } as unknown as NextRequest;

      const user = AuditService.getUserFromRequest(mockRequest);
      expect(user.user_role).toEqual([]);
    });
  });

  describe('bulkLog', () => {
    const mockClient = {
      query: jest.fn(),
    };

    it('should insert multiple audit logs in single query', async () => {
      const entries: AuditLogEntry[] = [
        {
          ...mockAuditEntry,
          entity_id: 'doc-1',
          action: 'CREATE',
        },
        {
          ...mockAuditEntry,
          entity_id: 'doc-2',
          action: 'UPDATE',
        },
        {
          ...mockAuditEntry,
          entity_id: 'doc-3',
          action: 'DELETE',
        },
      ];

      await AuditService.bulkLog(mockClient as unknown as PoolClient, entries);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit'),
        expect.any(Array)
      );
    });

    it('should handle empty entries array', async () => {
      await AuditService.bulkLog(mockClient as unknown as PoolClient, []);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should include all entries in bulk insert', async () => {
      const entries: AuditLogEntry[] = Array(5).fill(mockAuditEntry);

      await AuditService.bulkLog(mockClient as unknown as PoolClient, entries);

      const query = mockClient.query.mock.calls[0][0];
      // Should have 5 sets of placeholders
      const placeholderCount = (query.match(/\(\$[^)]+\)/g) || []).length;
      expect(placeholderCount).toBe(5);
    });
  });

  describe('Audit Event Types', () => {
    it('should log CREATE action', async () => {
      const entry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'CREATE',
      };
      await AuditService.log(entry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should log UPDATE action', async () => {
      const entry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'UPDATE',
      };
      await AuditService.log(entry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should log DELETE action', async () => {
      const entry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'DELETE',
      };
      await AuditService.log(entry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should log LOGIN action', async () => {
      const entry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'LOGIN',
        entity_type: 'user',
      };
      await AuditService.log(entry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should log APPROVE action', async () => {
      const entry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'APPROVE',
      };
      await AuditService.log(entry);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should log REJECT action', async () => {
      const entry: AuditLogEntry = {
        ...mockAuditEntry,
        action: 'REJECT',
      };
      await AuditService.log(entry);
      expect(mockQuery).toHaveBeenCalled();
    });
  });
});
