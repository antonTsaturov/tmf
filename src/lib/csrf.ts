/**
 * 🛡️  CSRF (CROSS-SITE REQUEST FORGERY) PROTECTION
 * 
 * Implements synchronizer token pattern for CSRF protection:
 * 1. Token generated and sent to client in response
 * 2. Client includes token in X-CSRF-Token header for state-changing requests
 * 3. Server validates token before processing POST/PUT/DELETE/PATCH
 * 
 * Tokens are cryptographically random and tied to user sessions.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * CSRF token configuration
 */
export const csrfConfig = {
  // Header name client should use
  headerName: 'X-CSRF-Token',
  
  // Cookie name for storing token
  cookieName: 'csrf-token',
  
  // Token expiration time (24 hours)
  tokenExpiry: 24 * 60 * 60 * 1000,
  
  // Methods that require CSRF protection
  protectedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
};

/**
 * In-memory store for CSRF tokens (in production, use Redis or database)
 * 
 * Structure: { sessionId: { token, expiresAt } }
 * 
 * NOTE: This in-memory store is sufficient for single-server deployments.
 * For distributed systems, implement with Redis:
 * 
 * ```typescript
 * const redis = new Redis();
 * redis.set(`csrf:${sessionId}`, token, 'EX', 86400);
 * const storedToken = await redis.get(`csrf:${sessionId}`);
 * ```
 */
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * Cleanup expired CSRF tokens (run periodically)
 */
export function cleanupExpiredTokens(): number {
  let deleted = 0;
  const now = Date.now();

  for (const [sessionId, { expiresAt }] of csrfTokenStore.entries()) {
    if (expiresAt < now) {
      csrfTokenStore.delete(sessionId);
      deleted++;
    }
  }

  if (deleted > 0) {
    logger.info(`CSRF: Cleaned up ${deleted} expired tokens`);
  }

  return deleted;
}

// Run cleanup hourly
if (typeof global !== 'undefined' && !('__csrfCleanupInterval' in global)) {
  (global as any).__csrfCleanupInterval = setInterval(() => {
    cleanupExpiredTokens();
  }, 60 * 60 * 1000);
}

/**
 * Generate a new CSRF token
 * Returns cryptographically secure random token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a CSRF token for a session
 */
export function createCsrfToken(sessionId: string): { token: string; expiresAt: number } {
  const token = generateCsrfToken();
  const expiresAt = Date.now() + csrfConfig.tokenExpiry;

  csrfTokenStore.set(sessionId, { token, expiresAt });

  logger.debug(`CSRF: Token created for session ${sessionId.substring(0, 8)}...`);

  return { token, expiresAt };
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(
  sessionId: string,
  token: string
): { valid: boolean; expired?: boolean } {
  const stored = csrfTokenStore.get(sessionId);

  // Token doesn't exist
  if (!stored) {
    logger.warn('CSRF: Token not found for session', { sessionId: sessionId.substring(0, 8) });
    return { valid: false };
  }

  // Token has expired
  if (stored.expiresAt < Date.now()) {
    csrfTokenStore.delete(sessionId);
    logger.warn('CSRF: Token expired for session', { sessionId: sessionId.substring(0, 8) });
    return { valid: false, expired: true };
  }

  // Token doesn't match (timing-safe comparison)
  if (!crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(token))) {
    logger.warn('CSRF: Token mismatch for session', { sessionId: sessionId.substring(0, 8) });
    return { valid: false };
  }

  // Token is valid - consume it (one-use tokens for extra security)
  csrfTokenStore.delete(sessionId);
  logger.debug(`CSRF: Token validated and consumed for session ${sessionId.substring(0, 8)}...`);

  return { valid: true };
}

/**
 * Check if request needs CSRF protection
 */
export function needsCsrfProtection(method: string | undefined): boolean {
  if (!method) return false;
  return csrfConfig.protectedMethods.includes(method.toUpperCase());
}

/**
 * Middleware to check CSRF token on protected requests
 * 
 * Usage in route handler:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const result = await requireCsrfToken(request, getCookie(request, 'sessionId') || '');
 *   if (!result.valid) {
 *     return new NextResponse('CSRF validation failed', { status: 403 });
 *   }
 *   // Continue with request
 * }
 * ```
 */
export async function requireCsrfToken(
  request: NextRequest,
  sessionId: string
): Promise<{ valid: boolean; statusCode: number; message: string }> {
  const token = request.headers.get(csrfConfig.headerName);

  if (!token) {
    logger.warn('CSRF: Missing CSRF token', {
      path: request.nextUrl.pathname,
      method: request.method,
    });
    return {
      valid: false,
      statusCode: 403,
      message: 'CSRF token missing',
    };
  }

  const { valid, expired } = validateCsrfToken(sessionId, token);

  if (!valid) {
    logger.warn('CSRF: Invalid CSRF token', {
      path: request.nextUrl.pathname,
      method: request.method,
      expired: expired || false,
    });

    return {
      valid: false,
      statusCode: expired ? 401 : 403,
      message: expired ? 'CSRF token expired' : 'CSRF token invalid',
    };
  }

  return {
    valid: true,
    statusCode: 200,
    message: 'CSRF token valid',
  };
}

/**
 * Helper to extract CSRF token from request body (for form submissions)
 * This is alternative to header-based token passing
 */
export async function extractCsrfTokenFromBody(request: NextRequest): Promise<string | null> {
  try {
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      const body = await request.json();
      return body._csrf_token || null;
    }

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      return params.get('_csrf_token') || null;
    }

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      return formData.get('_csrf_token') as string | null;
    }
  } catch (error) {
    logger.debug('CSRF: Error extracting token from body', { error });
  }

  return null;
}

/**
 * Configuration for .env.local:
 * 
 * CSRF_SAME_SITE=Strict     - SameSite policy: Strict, Lax, or None
 * CSRF_SECURE_ONLY=true     - Only send cookie over HTTPS (production)
 * 
 * IMPLEMENTATION EXAMPLES
 * 
 * See docs/CSRF.md for complete implementation guide
 * 
 * Basic flow:
 * 1. Client calls GET /api/csrf to get token
 * 2. Client includes token in X-CSRF-Token header for POST/PUT/DELETE
 * 3. Server validates token via requireCsrfToken function
 * 4. Token is consumed after validation (one-time use)
 */

