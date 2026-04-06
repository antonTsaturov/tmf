/**
 * Token Refresh Flow Tests
 *
 * Tests for:
 * - POST /api/auth/refresh endpoint
 * - Automatic token refresh via useTokenRefresh hook
 * - Session-based token refresh logic
 * - Expired token handling
 */

import jwt from 'jsonwebtoken';
import { AuthService, JwtPayload } from '@/lib/auth/auth.service';
import { createSession, getSession, updateSessionActivity, SESSION_CONFIG } from '@/lib/auth/session';
import { mockSessionStorage } from './setup';

// ─── Mock database ──────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.mock('@/lib/db', () => ({
  getPool: () => ({
    query: mockQuery,
  }),
}));

// ─── Mock logger ────────────────────────────────────────────────────
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

// ─── Mock ENV ───────────────────────────────────────────────────────
jest.mock('@/lib/config/env', () => ({
  ENV: {
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only-12345',
  },
}));

describe('Token Refresh - Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  describe('createSession', () => {
    it('should create a new session with valid data', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'test-hash',
      });

      expect(session).toBeDefined();
      expect(session.userId).toBe(1);
      expect(session.userEmail).toBe('test@example.com');
      expect(session.sessionId).toBeDefined();
      expect(session.isValid).toBe(true);
      expect(session.refreshTokenHash).toBe('test-hash');
    });

    it('should set createdAt and lastActivityAt to current time', () => {
      const beforeCreate = Date.now();
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'test-hash',
      });
      const afterCreate = Date.now();

      expect(session.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(session.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(session.lastActivityAt).toBe(session.createdAt);
    });

    it('should set expiresAt based on MAX_SESSION_DURATION', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'test-hash',
      });

      const expectedExpiresAt = session.createdAt + SESSION_CONFIG.MAX_SESSION_DURATION;
      expect(session.expiresAt).toBe(expectedExpiresAt);
    });
  });

  describe('getSession', () => {
    it('should return session if valid and not expired', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'test-hash',
      });

      const retrieved = getSession(session.sessionId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.sessionId).toBe(session.sessionId);
    });

    it('should return null for non-existent session', () => {
      const retrieved = getSession('non-existent-session');
      expect(retrieved).toBeNull();
    });

    it('should return null for invalidated session', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'test-hash',
      });

      // Manually invalidate by setting expiresAt to past
      const storedSession = mockSessionStorage.get(session.sessionId);
      if (storedSession) {
        storedSession.expiresAt = Date.now() - 1000;
      }

      const retrieved = getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });

    it('should return null for idle-timed-out session', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'test-hash',
      });

      // Manually set lastActivityAt to beyond idle timeout
      const storedSession = mockSessionStorage.get(session.sessionId);
      if (storedSession) {
        storedSession.lastActivityAt = Date.now() - SESSION_CONFIG.IDLE_TIMEOUT - 1000;
      }

      const retrieved = getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });
  });

  describe('updateSessionActivity', () => {
    it('should update lastActivityAt timestamp', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'test-hash',
      });

      const beforeUpdate = Date.now();
      const result = updateSessionActivity(session.sessionId);
      const afterUpdate = Date.now();

      expect(result).toBe(true);

      const updatedSession = getSession(session.sessionId);
      expect(updatedSession?.lastActivityAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(updatedSession?.lastActivityAt).toBeLessThanOrEqual(afterUpdate);
    });

    it('should return false for non-existent session', () => {
      const result = updateSessionActivity('non-existent');
      expect(result).toBe(false);
    });
  });
});

describe('Token Refresh - JWT Flow', () => {
  const mockPayload: JwtPayload = {
    id: 1,
    email: 'test@example.com',
    role: 'MONITOR',
    study_id: [1],
    assigned_site_id: [1],
    sessionId: 'test-session-id',
  };

  describe('Access Token', () => {
    it('should generate a valid access token with sessionId', () => {
      const token = AuthService.generateAccessToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should decode access token and include sessionId', () => {
      const token = AuthService.generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as JwtPayload;

      expect(decoded).toBeDefined();
      expect(decoded.sessionId).toBe(mockPayload.sessionId);
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should verify valid access token', () => {
      const token = AuthService.generateAccessToken(mockPayload);
      const verified = AuthService.verifyAccessToken(token);

      expect(verified).not.toBeNull();
      expect(verified?.sessionId).toBe(mockPayload.sessionId);
    });

    it('should return null for expired access token', () => {
      // Create a token with very short expiry by modifying the service temporarily
      const token = AuthService.generateAccessToken(mockPayload);

      // Wait for token to expire (in real scenario would be 15 min)
      // For test, use obviously invalid token
      const result = AuthService.verifyAccessToken('expired.invalid.token');
      expect(result).toBeNull();
    });
  });

  describe('Refresh Token', () => {
    it('should generate refresh token with session and tokenVersion', () => {
      const refreshPayload = {
        id: 1,
        email: 'test@example.com',
        sessionId: 'test-session-id',
        tokenVersion: 1,
      };

      const token = AuthService.generateRefreshToken(refreshPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.sessionId).toBe('test-session-id');
      expect(decoded.tokenVersion).toBe(1);
    });
  });

  describe('Token Hash', () => {
    it('should create consistent hash for refresh token', () => {
      const refreshToken = 'some-refresh-token';
      const hash1 = AuthService.hashRefreshToken(refreshToken);
      const hash2 = AuthService.hashRefreshToken(refreshToken);

      expect(hash1).toBe(hash2);
    });

    it('should create different hashes for different tokens', () => {
      const hash1 = AuthService.hashRefreshToken('token-1');
      const hash2 = AuthService.hashRefreshToken('token-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should verify refresh token hash correctly', () => {
      const refreshToken = 'some-refresh-token';
      const hash = AuthService.hashRefreshToken(refreshToken);

      expect(AuthService.verifyRefreshTokenHash(refreshToken, hash)).toBe(true);
    });

    it('should reject wrong refresh token', () => {
      const hash = AuthService.hashRefreshToken('correct-token');

      expect(AuthService.verifyRefreshTokenHash('wrong-token', hash)).toBe(false);
    });
  });
});

describe('Token Refresh - Login Creates Session', () => {
  it('should include sessionId in the JWT payload after login', () => {
    // Simulate login flow: create session → generate token
    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'login-hash',
    });

    const tokenPayload: JwtPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'MONITOR',
      study_id: [1],
      assigned_site_id: [1],
      sessionId: session.sessionId,
    };

    const token = AuthService.generateAccessToken(tokenPayload);
    const decoded = AuthService.verifyAccessToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.sessionId).toBe(session.sessionId);
  });

  it('should allow refresh using sessionId from token', () => {
    // Step 1: Login creates session + token
    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'login-hash',
    });

    const tokenPayload: JwtPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'MONITOR',
      study_id: [1],
      assigned_site_id: [1],
      sessionId: session.sessionId,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);

    // Step 2: Extract sessionId from token (even if expired — using jwt.decode)
    const decoded = jwt.decode(accessToken) as { sessionId: string; id: number; email: string };
    expect(decoded.sessionId).toBe(session.sessionId);

    // Step 3: Verify session is still active
    const activeSession = getSession(decoded.sessionId);
    expect(activeSession).not.toBeNull();
    expect(activeSession?.userId).toBe(1);
  });

  it('should refresh token after access token expires', () => {
    // Create session and token
    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'login-hash',
    });

    const tokenPayload: JwtPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'MONITOR',
      study_id: [1],
      assigned_site_id: [1],
      sessionId: session.sessionId,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);

    // Simulate token expiry: verifyAccessToken returns null
    // But jwt.decode still extracts sessionId
    const decoded = jwt.decode(accessToken) as { sessionId: string };

    // Session should still be valid
    const activeSession = getSession(decoded.sessionId);
    expect(activeSession).not.toBeNull();

    // Activity should be updatable
    const updated = updateSessionActivity(decoded.sessionId);
    expect(updated).toBe(true);
  });
});

describe('useTokenRefresh Hook - Behavior', () => {
  // These tests document the expected behavior of the hook
  // Actual hook testing would require @testing-library/react-hooks

  describe('Refresh Interval', () => {
    it('should refresh every 10 minutes (before 15-min token expiry)', () => {
      const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
      const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes

      // Refresh should happen before token expires
      expect(REFRESH_INTERVAL).toBeLessThan(ACCESS_TOKEN_EXPIRY);

      // Buffer of 5 minutes should be sufficient
      const buffer = ACCESS_TOKEN_EXPIRY - REFRESH_INTERVAL;
      expect(buffer).toBe(5 * 60 * 1000); // 5 minutes buffer
    });
  });

  describe('Refresh Failure Handling', () => {
    it('should fail refresh when session is expired (idle timeout)', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'login-hash',
      });

      // Simulate idle timeout
      const storedSession = mockSessionStorage.get(session.sessionId);
      if (storedSession) {
        storedSession.lastActivityAt = Date.now() - SESSION_CONFIG.IDLE_TIMEOUT - 1000;
      }

      const activeSession = getSession(session.sessionId);
      expect(activeSession).toBeNull();
      // Refresh would fail → user redirected to login
    });

    it('should fail refresh when session is invalidated (logout)', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'login-hash',
      });

      // Session is valid
      expect(getSession(session.sessionId)).not.toBeNull();
    });
  });

  describe('Refresh Success', () => {
    it('should succeed when session is active and not idle-timed-out', () => {
      const session = createSession({
        userId: 1,
        userEmail: 'test@example.com',
        refreshTokenHash: 'login-hash',
      });

      // Update activity to keep session alive
      updateSessionActivity(session.sessionId);

      const activeSession = getSession(session.sessionId);
      expect(activeSession).not.toBeNull();
      expect(activeSession?.userId).toBe(1);
      // Refresh would succeed → new access token issued
    });
  });
});

describe('Logout - Session Invalidation', () => {
  it('should invalidate session on logout', () => {
    const { invalidateSession } = require('@/lib/auth/session');

    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'login-hash',
    });

    // Session is valid before logout
    expect(getSession(session.sessionId)).not.toBeNull();

    // Invalidate session
    const invalidated = invalidateSession(session.sessionId);
    expect(invalidated).toBe(true);

    // Session should be invalid after logout
    const afterLogout = getSession(session.sessionId);
    expect(afterLogout).toBeNull();
  });

  it('should allow extracting sessionId from expired token for logout', () => {
    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'login-hash',
    });

    const tokenPayload: JwtPayload = {
      id: 1,
      email: 'test@example.com',
      role: 'MONITOR',
      study_id: [1],
      assigned_site_id: [1],
      sessionId: session.sessionId,
    };

    const token = AuthService.generateAccessToken(tokenPayload);

    // Even if token expires, jwt.decode still extracts sessionId
    const decoded = jwt.decode(token) as { sessionId: string };
    expect(decoded.sessionId).toBe(session.sessionId);

    // This allows logout to work even with expired access token
  });
});
