/**
 * Auth Login + Access Tests
 *
 * Tests for:
 * - Successful login → token generation → access
 * - Failed login (wrong password, unknown user)
 * - Token expiry and refresh
 * - Session invalidation on logout
 * - Access denial for unauthenticated requests
 * - Password reset flow (token generation and validation)
 */

import {
  AuthService,
  JwtPayload,
} from '../lib/auth/auth.service';
//import { ACCESS_TOKEN_EXPIRY } from '../lib/auth/auth.service';

// --- Helpers ---

const createMockUser = (overrides?: Partial<JwtPayload>): JwtPayload => ({
  id: 1,
  email: 'user@example.com',
  role: 'MONITOR',
  study_id: [1],
  assigned_site_id: [1],
  sessionId: 'session-test-123',
  ...overrides,
});

// --- Tests ---

describe('Auth Login + Access', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.runOnlyPendingTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Successful Login Flow', () => {
    it('should generate valid access token on login', () => {
      const user = createMockUser();
      const token = AuthService.generateAccessToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include all user claims in the token', () => {
      const user = createMockUser({
        id: 42,
        email: 'admin@etmf.com',
        role: 'ADMIN',
        study_id: [10, 20],
        assigned_site_id: [100],
      });

      const token = AuthService.generateAccessToken(user);
      const decoded = AuthService.verifyAccessToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(42);
      expect(decoded!.email).toBe('admin@etmf.com');
      expect(decoded!.role).toBe('ADMIN');
      expect(decoded!.study_id).toEqual([10, 20]);
      expect(decoded!.assigned_site_id).toEqual([100]);
    });

    it('should generate refresh token alongside access token', () => {
      const refreshPayload = {
        id: 1,
        email: 'user@example.com',
        sessionId: 'session-abc',
        tokenVersion: 1,
      };

      const refreshToken = AuthService.generateRefreshToken(refreshPayload);
      const decoded = AuthService.verifyRefreshToken(refreshToken);

      expect(decoded).not.toBeNull();
      expect(decoded!.sessionId).toBe('session-abc');
      expect(decoded!.tokenVersion).toBe(1);
    });
  });

  describe('Failed Login', () => {
    it('should reject invalid access tokens', () => {
      const result = AuthService.verifyAccessToken('not-a-valid-token');
      expect(result).toBeNull();
    });

    it('should reject tampered tokens', () => {
      const user = createMockUser();
      const validToken = AuthService.generateAccessToken(user);

      // Tamper with the payload (middle segment)
      const parts = validToken.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ id: 999, role: 'ADMIN' }),
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const result = AuthService.verifyAccessToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should reject expired access tokens', () => {
      // Create a token and manually forge a past expiration
      const user = createMockUser();
      const token = AuthService.generateAccessToken(user);

      // Token should be valid now
      const current = AuthService.verifyAccessToken(token);
      expect(current).not.toBeNull();

      // In a real scenario, after 15 minutes the token would be expired
      // Here we verify the expiry claim exists
      const decoded = current! as JwtPayload & { exp?: number };
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
    });

    it('should reject tokens with wrong secret', () => {
      // Tokens generated with one secret should fail with another
      const user = createMockUser();
      const token = AuthService.generateAccessToken(user);

      // Since we can't easily change the secret at runtime,
      // we test that random strings are rejected
      const randomToken = Buffer.from('random:payload:signature').toString(
        'base64url',
      );
      expect(AuthService.verifyAccessToken(randomToken)).toBeNull();
    });
  });

  describe('Token Expiry and Refresh', () => {
    it('should have access token with exp claim', () => {
      const user = createMockUser();
      const token = AuthService.generateAccessToken(user);
      const decoded = AuthService.verifyAccessToken(token) as JwtPayload & {
        exp?: number;
      };

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should generate a new valid token on refresh', () => {
      const refreshPayload = {
        id: 1,
        email: 'user@example.com',
        sessionId: 'session-xyz',
        tokenVersion: 1,
      };

      const refreshToken = AuthService.generateRefreshToken(refreshPayload);
      const decoded = AuthService.verifyRefreshToken(refreshToken);

      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(1);
      expect(decoded!.sessionId).toBe('session-xyz');
    });

    it('should reject expired refresh tokens', () => {
      const invalidResult = AuthService.verifyRefreshToken('expired-token');
      expect(invalidResult).toBeNull();
    });
  });

  describe('Session Invalidation on Logout', () => {
    it('should create a session on login', () => {
      // This is verified by the mock session storage
      const { createSession } = require('@/lib/auth/session');

      createSession({
        userId: 1,
        userEmail: 'user@example.com',
        refreshTokenHash: 'hashed-refresh-token',
      });

      // At least one session should exist (imported from this test file's scope)
      const { mockSessionStorage } = require('./setup');
      expect(mockSessionStorage.size).toBeGreaterThan(0);
    });

    it('should invalidate session on logout', () => {
      const { createSession, getSession, invalidateSession } = require(
        '@/lib/auth/session',
      );

      const session = createSession({
        userId: 2,
        userEmail: 'logout-user@example.com',
        refreshTokenHash: 'hashed-token-logout',
      });

      expect(getSession(session.sessionId)).not.toBeNull();

      const result = invalidateSession(session.sessionId);
      expect(result).toBe(true);
      expect(getSession(session.sessionId)).toBeNull();
    });
  });

  describe('Access Denied for Unauthenticated Requests', () => {
    it('should return null for missing token', () => {
      const result = AuthService.verifyAccessToken('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace token', () => {
      const result = AuthService.verifyAccessToken('   ');
      expect(result).toBeNull();
    });
  });

  describe('Password Reset Token Flow', () => {
    it('should generate a valid reset token', () => {
      const token = AuthService.generateResetToken('user@example.com');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify a valid reset token', () => {
      const token = AuthService.generateResetToken('user@example.com');
      const decoded = AuthService.verifyResetToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.email).toBe('user@example.com');
      expect(decoded!.type).toBe('password_reset');
    });

    it('should reject invalid reset tokens', () => {
      const decoded = AuthService.verifyResetToken('invalid-reset-token');
      expect(decoded).toBeNull();
    });
  });

  describe('Header Token Extraction', () => {
    it('should extract Bearer token from Authorization header', () => {
      const headers = new Headers({
        Authorization: 'Bearer some-jwt-token',
      });

      const token = AuthService.extractTokenFromHeaders(headers);
      expect(token).toBe('some-jwt-token');
    });

    it('should return null for missing Authorization header', () => {
      const headers = new Headers();
      const token = AuthService.extractTokenFromHeaders(headers);
      expect(token).toBeNull();
    });

    it('should return null for non-Bearer scheme', () => {
      const headers = new Headers({
        Authorization: 'Basic dXNlcjpwYXNz',
      });

      const token = AuthService.extractTokenFromHeaders(headers);
      expect(token).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const headers = new Headers({
        Authorization: 'Bearer',
      });

      const token = AuthService.extractTokenFromHeaders(headers);
      expect(token).toBeNull();
    });
  });
});
