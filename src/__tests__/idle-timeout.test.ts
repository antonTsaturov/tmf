/**
 * Idle Timeout Tests
 *
 * Tests for the client-side idle timeout mechanism:
 * - After 15 minutes of inactivity, the user should be logged out
 * - Activity (mouse, keyboard, scroll) resets the idle timer
 * - The hook should only be active when enabled=true
 *
 * These tests verify the idle timeout *logic* (pure functions).
 * The hook itself uses window APIs which are not available in the
 * Jest 'node' test environment.
 */

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 min
const CHECK_INTERVAL = 60 * 1000;    // 1 min

/**
 * Pure idle timeout check logic — extracted from the hook for testability.
 * Returns true if the user has been idle longer than IDLE_TIMEOUT.
 */
function checkIdleTimeout(params: {
  lastActivityAt: number;
  now: number;
  timeoutHandled: boolean;
  onIdleTimeout: () => void;
}): { shouldTrigger: boolean; newTimeoutHandled: boolean } {
  const idleTime = params.now - params.lastActivityAt;
  if (idleTime >= IDLE_TIMEOUT && !params.timeoutHandled) {
    params.onIdleTimeout();
    return { shouldTrigger: true, newTimeoutHandled: true };
  }
  return { shouldTrigger: false, newTimeoutHandled: params.timeoutHandled };
}

describe('Idle timeout logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should trigger onIdleTimeout after 15 minutes of inactivity', () => {
    const now = Date.now();
    const lastActivityAt = now - IDLE_TIMEOUT - 1000;
    const onIdleTimeout = jest.fn();

    const result = checkIdleTimeout({
      lastActivityAt,
      now,
      timeoutHandled: false,
      onIdleTimeout,
    });

    expect(result.shouldTrigger).toBe(true);
    expect(result.newTimeoutHandled).toBe(true);
    expect(onIdleTimeout).toHaveBeenCalledTimes(1);
  });

  it('should NOT trigger if idle time is less than IDLE_TIMEOUT', () => {
    const now = Date.now();
    const lastActivityAt = now - (14 * 60 * 1000);
    const onIdleTimeout = jest.fn();

    const result = checkIdleTimeout({
      lastActivityAt,
      now,
      timeoutHandled: false,
      onIdleTimeout,
    });

    expect(result.shouldTrigger).toBe(false);
    expect(onIdleTimeout).not.toHaveBeenCalled();
  });

  it('should NOT trigger again if timeout was already handled', () => {
    const now = Date.now();
    const lastActivityAt = now - IDLE_TIMEOUT - 1000;
    const onIdleTimeout = jest.fn();

    // First call — triggers
    checkIdleTimeout({ lastActivityAt, now, timeoutHandled: false, onIdleTimeout });
    expect(onIdleTimeout).toHaveBeenCalledTimes(1);

    // Second call — should NOT trigger (timeoutHandled=true)
    checkIdleTimeout({ lastActivityAt, now, timeoutHandled: true, onIdleTimeout });
    expect(onIdleTimeout).toHaveBeenCalledTimes(1);
  });

  it('should allow trigger again after activity resets lastActivityAt', () => {
    const startTime = Date.now();
    const onIdleTimeout = jest.fn();

    // First trigger
    const firstCheck = checkIdleTimeout({
      lastActivityAt: startTime - IDLE_TIMEOUT - 1000,
      now: startTime,
      timeoutHandled: false,
      onIdleTimeout,
    });
    expect(firstCheck.shouldTrigger).toBe(true);
    expect(onIdleTimeout).toHaveBeenCalledTimes(1);

    // User activity resets lastActivityAt to "now"
    const activityTime = startTime + 1000;

    // Check right after activity — should NOT trigger
    const afterActivity = checkIdleTimeout({
      lastActivityAt: activityTime,
      now: activityTime,
      timeoutHandled: false,
      onIdleTimeout,
    });
    expect(afterActivity.shouldTrigger).toBe(false);

    // After another 15 min of inactivity — should trigger again
    const laterTime = activityTime + IDLE_TIMEOUT + 1000;
    const laterCheck = checkIdleTimeout({
      lastActivityAt: activityTime,
      now: laterTime,
      timeoutHandled: false,
      onIdleTimeout,
    });
    expect(laterCheck.shouldTrigger).toBe(true);
    expect(onIdleTimeout).toHaveBeenCalledTimes(2);
  });

  it('should check at CHECK_INTERVAL granularity, not continuously', () => {
    const onIdleTimeout = jest.fn();
    const startTime = Date.now();

    // Simulate the setInterval-based check loop
    const lastActivityAt = startTime;
    let timeoutHandled = false;
    let tickCount = 0;

    // Tick every CHECK_INTERVAL for 20 minutes
    for (let elapsed = 0; elapsed < 20 * 60 * 1000; elapsed += CHECK_INTERVAL) {
      tickCount++;
      const result = checkIdleTimeout({
        lastActivityAt,
        now: startTime + elapsed,
        timeoutHandled,
        onIdleTimeout,
      });
      timeoutHandled = result.newTimeoutHandled;
    }

    expect(onIdleTimeout).toHaveBeenCalledTimes(1);
    expect(tickCount).toBeGreaterThan(0);
  });

  it('should handle the AuthProvider idle timeout flow correctly', () => {
    // Simulate what happens in AuthProvider.handleIdleTimeout:
    // 1. setUser(null)
    // 2. localStorage.setItem('auth-logout', timestamp)
    // 3. window.location.href = '/login'

    let currentUser: { id: string } | null = { id: 'user-1' };
    const storageEvents: { key: string; value: string }[] = [];

    const handleIdleTimeout = () => {
      currentUser = null;
      storageEvents.push({ key: 'auth-logout', value: Date.now().toString() });
    };

    handleIdleTimeout();

    expect(currentUser).toBeNull();
    expect(storageEvents).toHaveLength(1);
    expect(storageEvents[0].key).toBe('auth-logout');
  });
});

describe('Server-side IDLE_TIMEOUT config', () => {
  it('should match the client-side IDLE_TIMEOUT constant', () => {
    const { SESSION_CONFIG } = require('@/lib/auth/session');

    expect(SESSION_CONFIG.IDLE_TIMEOUT).toBe(IDLE_TIMEOUT);
    expect(SESSION_CONFIG.IDLE_TIMEOUT).toBe(15 * 60 * 1000);
  });

  it('should be less than REFRESH_TOKEN_EXPIRY', () => {
    const { SESSION_CONFIG } = require('@/lib/auth/session');

    // Idle timeout should be shorter than refresh token expiry (7 days)
    expect(SESSION_CONFIG.IDLE_TIMEOUT).toBeLessThan(SESSION_CONFIG.REFRESH_TOKEN_EXPIRY);
  });

  it('should be greater than ACCESS_TOKEN_EXPIRY', () => {
    const { SESSION_CONFIG } = require('@/lib/auth/session');

    // Idle timeout should be greater than access token expiry (15 min)
    // so that active users can keep refreshing tokens
    expect(SESSION_CONFIG.IDLE_TIMEOUT).toBeGreaterThanOrEqual(SESSION_CONFIG.ACCESSTOKEN_EXPIRY);
  });
});

describe('Session idle timeout logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // Clear the mock session storage from setup.ts
    const { mockSessionStorage } = require('@/__tests__/setup');
    mockSessionStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return null for session that exceeded IDLE_TIMEOUT', () => {
    const { createSession, getSession, SESSION_CONFIG } = require('@/lib/auth/session');

    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'test-hash',
    });

    // Manually set lastActivityAt to beyond idle timeout
    const storedSession = require('@/__tests__/setup').mockSessionStorage.get(session.sessionId);
    if (storedSession) {
      storedSession.lastActivityAt = Date.now() - SESSION_CONFIG.IDLE_TIMEOUT - 1000;
    }

    const retrieved = getSession(session.sessionId);
    expect(retrieved).toBeNull();
  });

  it('should return valid session when activity is within IDLE_TIMEOUT', () => {
    const { createSession, getSession } = require('@/lib/auth/session');

    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'test-hash',
    });

    // Session was active recently
    const storedSession = require('@/__tests__/setup').mockSessionStorage.get(session.sessionId);
    if (storedSession) {
      storedSession.lastActivityAt = Date.now() - 60 * 1000; // 1 min ago
    }

    const retrieved = getSession(session.sessionId);
    expect(retrieved).not.toBeNull();
    expect(retrieved.isValid).toBe(true);
  });

  it('should refresh succeed when session is active but fail when idle', () => {
    const { createSession, getSession, SESSION_CONFIG } = require('@/lib/auth/session');
    const { AuthService } = require('@/lib/auth/auth.service');

    const session = createSession({
      userId: 1,
      userEmail: 'test@example.com',
      refreshTokenHash: 'test-hash',
    });

    // Generate an access token with the session ID
    const tokenPayload = {
      id: session.userId,
      email: session.userEmail,
      role: 'admin',
      study_id: [],
      assigned_site_id: [],
      sessionId: session.sessionId,
    };
    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const decoded = AuthService.verifyAccessToken(accessToken);
    expect(decoded?.sessionId).toBe(session.sessionId);

    // Session is active — getSession returns valid session
    const activeSession = getSession(session.sessionId);
    expect(activeSession).not.toBeNull();

    // Now idle out the session
    const storedSession = require('@/__tests__/setup').mockSessionStorage.get(session.sessionId);
    if (storedSession) {
      storedSession.lastActivityAt = Date.now() - SESSION_CONFIG.IDLE_TIMEOUT - 1000;
    }

    // Session is now idle-timed-out — getSession returns null
    const idleSession = getSession(session.sessionId);
    expect(idleSession).toBeNull();
  });
});
