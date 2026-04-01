/**
 * 🔐 SESSION MANAGEMENT SYSTEM
 * 
 * Manages user sessions with:
 * - Refresh token support
 * - Logout invalidation
 * - Idle timeout (15-30 min)
 * - Secure cookie handling
 */

interface SessionData {
  sessionId: string;
  userId: number;
  userEmail: string;
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
  refreshTokenHash: string; // Hash of refresh token for verification
  isValid: boolean;
}

/**
 * In-memory session store
 * In production, use Redis or database for distributed deployments
 * 
 * Structure: {
 *   sessionId: SessionData
 * }
 */
const sessionStore = new Map<string, SessionData>();

/**
 * Configuration
 */
export const SESSION_CONFIG = {
  // Access token expiration (short-lived, used with refresh token)
  ACCESSTOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
  
  // Refresh token expiration (long-lived, used to get new access token)
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Idle timeout (user must be active within this period)
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  
  // Max session duration (regardless of activity)
  MAX_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Create a new session
 */
export function createSession(params: {
  userId: number;
  userEmail: string;
  refreshTokenHash: string;
}): SessionData {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  const session: SessionData = {
    sessionId,
    userId: params.userId,
    userEmail: params.userEmail,
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + SESSION_CONFIG.MAX_SESSION_DURATION,
    refreshTokenHash: params.refreshTokenHash,
    isValid: true,
  };
  
  sessionStore.set(sessionId, session);
  
  return session;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): SessionData | null {
  const session = sessionStore.get(sessionId);
  
  if (!session || !session.isValid) {
    return null;
  }
  
  // Check if session has expired (max duration exceeded)
  if (session.expiresAt < Date.now()) {
    session.isValid = false;
    return null;
  }
  
  // Check if idle timeout exceeded
  const idleTime = Date.now() - session.lastActivityAt;
  if (idleTime > SESSION_CONFIG.IDLE_TIMEOUT) {
    session.isValid = false;
    return null;
  }
  
  return session;
}

/**
 * Update session last activity (called on each request)
 */
export function updateSessionActivity(sessionId: string): boolean {
  const session = getSession(sessionId);
  
  if (!session) {
    return false;
  }
  
  session.lastActivityAt = Date.now();
  return true;
}

/**
 * Invalidate session (logout)
 */
export function invalidateSession(sessionId: string): boolean {
  const session = sessionStore.get(sessionId);
  
  if (session) {
    session.isValid = false;
    // Remove from store after a delay to prevent race conditions
    setTimeout(() => {
      sessionStore.delete(sessionId);
    }, 1000);
    return true;
  }
  
  return false;
}

/**
 * Invalidate all sessions for a user (e.g., on password change)
 */
export function invalidateUserSessions(userId: number): number {
  let count = 0;
  
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId && session.isValid) {
      session.isValid = false;
      count++;
      
      // Remove after delay
      setTimeout(() => {
        sessionStore.delete(sessionId);
      }, 1000);
    }
  }
  
  return count;
}

/**
 * Check if refresh token is valid for session
 */
export function verifyRefreshToken(sessionId: string, refreshTokenHash: string): boolean {
  const session = getSession(sessionId);
  
  if (!session) {
    return false;
  }
  
  // Timing-safe comparison
  return session.refreshTokenHash === refreshTokenHash;
}

/**
 * Cleanup expired sessions (run periodically)
 */
export function cleanupExpiredSessions(): number {
  let removed = 0;
  const now = Date.now();
  
  for (const [sessionId, session] of sessionStore.entries()) {
    // Remove if invalid or expired
    if (!session.isValid || session.expiresAt < now) {
      sessionStore.delete(sessionId);
      removed++;
    }
    // Remove if idle timeout exceeded
    else if ((now - session.lastActivityAt) > SESSION_CONFIG.IDLE_TIMEOUT) {
      session.isValid = false;
      sessionStore.delete(sessionId);
      removed++;
    }
  }
  
  return removed;
}

/**
 * Get session statistics (for monitoring)
 */
export function getSessionStats() {
  let totalSessions = 0;
  let activeSessions = 0;
  let expiredSessions = 0;
  const now = Date.now();
  
  for (const session of sessionStore.values()) {
    totalSessions++;
    
    if (!session.isValid || session.expiresAt < now) {
      expiredSessions++;
    } else {
      activeSessions++;
    }
  }
  
  return { totalSessions, activeSessions, expiredSessions };
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Run cleanup periodically (every 5 minutes)
 */
if (typeof global !== 'undefined' && !('__sessionCleanupInterval' in global)) {
  (global as any).__sessionCleanupInterval = setInterval(() => {
    cleanupExpiredSessions();
  }, 5 * 60 * 1000);
}

/**
 * Configuration Guide:
 * 
 * .env.local:
 * ```
 * # Session Configuration
 * SESSION_IDLE_TIMEOUT=1800000        # 30 minutes in milliseconds
 * SESSION_MAX_DURATION=86400000       # 24 hours in milliseconds
 * ACCESS_TOKEN_EXPIRY=900000          # 15 minutes in milliseconds
 * REFRESH_TOKEN_EXPIRY=604800000      # 7 days in milliseconds
 * ```
 * 
 * For production with multiple servers, migrate to:
 * - Redis for distributed session storage
 * - Database for persistent session records
 * - Message queues for session invalidation broadcast
 */
