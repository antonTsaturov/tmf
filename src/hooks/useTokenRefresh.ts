'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes (access token lives 15 min)
const RETRY_DELAY = 60 * 1000; // 1 minute retry delay on failure

interface UseTokenRefreshOptions {
  onRefreshSuccess?: (accessToken: string) => void;
  onRefreshFailure?: () => void;
  enabled?: boolean;
}

/**
 * Automatically refreshes the access token before it expires.
 *
 * The access token has a 15-minute lifetime. This hook calls /api/auth/refresh
 * every 10 minutes to keep the session alive (refresh token lives 7 days).
 *
 * Should be used inside AuthProvider so the user gets logged out on failure.
 */
export function useTokenRefresh(options?: UseTokenRefreshOptions) {
  const { onRefreshSuccess, onRefreshFailure, enabled = true } = options || {};
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();

        if (onRefreshSuccess) {
          onRefreshSuccess(data.accessToken);
        }

        return true;
      } else {
        // Refresh failed — token expired or session invalidated
        if (onRefreshFailure) {
          onRefreshFailure();
        }

        return false;
      }
    } catch {
      if (onRefreshFailure) {
        onRefreshFailure();
      }
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefreshSuccess, onRefreshFailure]);

  useEffect(() => {
    if (!enabled) return;

    // Start periodic refresh
    intervalRef.current = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refresh]);

  return { refresh };
}
