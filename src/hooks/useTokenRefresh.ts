// 'use client';

// import { useEffect, useRef, useCallback } from 'react';

// const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes (access token lives 15 min)

// interface UseTokenRefreshOptions {
//   onRefreshSuccess?: (accessToken: string) => void;
//   onRefreshFailure?: () => void;
//   enabled?: boolean;
// }

// /**
//  * Automatically refreshes the access token before it expires.
//  *
//  * The access token has a 15-minute lifetime. This hook calls /api/auth/refresh
//  * every 10 minutes to keep the session alive (refresh token lives 7 days).
//  *
//  * Should be used inside AuthProvider so the user gets logged out on failure.
//  */
// export function useTokenRefresh(options?: UseTokenRefreshOptions) {
//   const { onRefreshSuccess, onRefreshFailure, enabled = true } = options || {};
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);
//   const isRefreshingRef = useRef(false);

//   const refresh = useCallback(async (): Promise<boolean> => {
//     if (isRefreshingRef.current) return false;
//     isRefreshingRef.current = true;

//     try {
//       const response = await fetch('/api/auth/refresh', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({}),
//       });

//       if (response.ok) {
//         const data = await response.json();

//         if (onRefreshSuccess) {
//           onRefreshSuccess(data.accessToken);
//         }

//         return true;
//       } else {
//         // Refresh failed — token expired or session invalidated
//         if (onRefreshFailure) {
//           onRefreshFailure();
//         }

//         return false;
//       }
//     } catch {
//       if (onRefreshFailure) {
//         onRefreshFailure();
//       }
//       return false;
//     } finally {
//       isRefreshingRef.current = false;
//     }
//   }, [onRefreshSuccess, onRefreshFailure]);

//   // useEffect(() => {
//   //   if (!enabled) return;

//   //   // Start periodic refresh
//   //   intervalRef.current = setInterval(() => {
//   //     refresh();
//   //   }, REFRESH_INTERVAL);

//   //   return () => {
//   //     if (intervalRef.current) {
//   //       clearInterval(intervalRef.current);
//   //     }
//   //   };
//   // }, [enabled, refresh]);

//   // Обновленная версия с учетом потери фокуса вкладки и обновлением таймера при возврате на вкладку
//   useEffect(() => {
//     if (!enabled) return;

//     const handleFocus = () => {
//       // При возвращении на вкладку проверяем, не пора ли обновиться
//       refresh(); 
//     };

//     window.addEventListener('focus', handleFocus);
    
//     intervalRef.current = setInterval(() => {
//       refresh();
//     }, REFRESH_INTERVAL);

//     return () => {
//       window.removeEventListener('focus', handleFocus);
//       if (intervalRef.current) clearInterval(intervalRef.current);
//     };
//   }, [enabled, refresh]);  

//   return { refresh };
// }

// Улучшенная версия DeepSeek. При изменении см. AuthProvider

// 'use client';

// import { useEffect, useRef, useCallback } from 'react';

// const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
// const MAX_REFRESH_RETRIES = 3;
// const REFRESH_COOLDOWN = 30 * 1000; // 30 seconds cooldown after failure

// interface UseTokenRefreshOptions {
//   onRefreshSuccess?: (accessToken: string) => void;
//   onRefreshFailure?: () => void;
//   enabled?: boolean;
// }

// /**
//  * Automatically refreshes the access token before it expires.
//  * 
//  * Features:
//  * - Refreshes every 10 minutes when user is active
//  * - Prevents multiple concurrent refresh requests
//  * - Retries failed refreshes with exponential backoff
//  * - Checks user activity before refreshing
//  * - Handles network errors gracefully
//  */
// export function useTokenRefresh(options?: UseTokenRefreshOptions) {
//   const { onRefreshSuccess, onRefreshFailure, enabled = true } = options || {};
  
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);
//   const isRefreshingRef = useRef(false);
//   const failureCountRef = useRef(0);
//   const lastActivityRef = useRef(Date.now());
//   const lastRefreshTimeRef = useRef(0);
//   const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   // Track user activity
//   useEffect(() => {
//     if (!enabled) return;

//     const updateActivity = () => {
//       lastActivityRef.current = Date.now();
//     };

//     window.addEventListener('click', updateActivity);
//     window.addEventListener('keypress', updateActivity);
//     window.addEventListener('scroll', updateActivity);
//     window.addEventListener('mousemove', updateActivity);

//     return () => {
//       window.removeEventListener('click', updateActivity);
//       window.removeEventListener('keypress', updateActivity);
//       window.removeEventListener('scroll', updateActivity);
//       window.removeEventListener('mousemove', updateActivity);
//     };
//   }, [enabled]);

//   const refresh = useCallback(async (): Promise<boolean> => {
//     // Prevent multiple concurrent refreshes
//     if (isRefreshingRef.current) {
//       console.log('[TokenRefresh] Refresh already in progress, skipping');
//       return false;
//     }

//     // Don't refresh if user has been inactive for > 5 minutes
//     const timeSinceLastActivity = Date.now() - lastActivityRef.current;
//     if (timeSinceLastActivity > 5 * 60 * 1000) {
//       console.log('[TokenRefresh] User inactive, skipping refresh');
//       return false;
//     }

//     // Don't refresh too frequently (cooldown)
//     const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;
//     if (timeSinceLastRefresh < REFRESH_COOLDOWN && lastRefreshTimeRef.current > 0) {
//       console.log('[TokenRefresh] Refresh cooldown active, skipping');
//       return false;
//     }

//     isRefreshingRef.current = true;

//     try {
//       const controller = new AbortController();
//       const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

//       const response = await fetch('/api/auth/refresh', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         signal: controller.signal,
//       });

//       clearTimeout(timeoutId);

//       if (response.ok) {
//         const data = await response.json();
        
//         // Reset failure count on success
//         failureCountRef.current = 0;
//         lastRefreshTimeRef.current = Date.now();
        
//         console.log('[TokenRefresh] Refresh successful');
        
//         if (onRefreshSuccess) {
//           onRefreshSuccess(data.accessToken);
//         }
        
//         return true;
//       } else {
//         // Handle specific status codes
//         if (response.status === 401) {
//           // Session expired, don't retry
//           console.log('[TokenRefresh] Session expired');
//           if (onRefreshFailure) {
//             onRefreshFailure();
//           }
//           return false;
//         }
        
//         // Other errors (500, 503, etc.) - retry with backoff
//         throw new Error(`Refresh failed with status ${response.status}`);
//       }
//     } catch (error) {
//       console.error('[TokenRefresh] Refresh error:', error);
      
//       // Retry logic for network errors
//       if (failureCountRef.current < MAX_REFRESH_RETRIES) {
//         failureCountRef.current++;
        
//         // Exponential backoff: 1s, 2s, 4s
//         const backoffDelay = Math.pow(2, failureCountRef.current - 1) * 1000;
        
//         console.log(`[TokenRefresh] Scheduling retry in ${backoffDelay}ms (attempt ${failureCountRef.current}/${MAX_REFRESH_RETRIES})`);
        
//         if (refreshTimeoutRef.current) {
//           clearTimeout(refreshTimeoutRef.current);
//         }
        
//         refreshTimeoutRef.current = setTimeout(() => {
//           refresh();
//         }, backoffDelay);
        
//         return false;
//       } else {
//         // Max retries exceeded
//         console.error('[TokenRefresh] Max retries exceeded');
//         if (onRefreshFailure) {
//           onRefreshFailure();
//         }
//         return false;
//       }
//     } finally {
//       isRefreshingRef.current = false;
//     }
//   }, [onRefreshSuccess, onRefreshFailure]);

//   // Trigger refresh on page visibility change
//   const handleVisibilityChange = useCallback(() => {
//     if (document.visibilityState === 'visible') {
//       // Check if we need to refresh when tab becomes visible again
//       const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;
      
//       // If last refresh was more than 12 minutes ago (close to 15 min expiry)
//       if (timeSinceLastRefresh > 12 * 60 * 1000) {
//         console.log('[TokenRefresh] Tab became visible, checking token validity');
//         refresh();
//       }
//     }
//   }, [refresh]);

//   // Main interval setup
//   useEffect(() => {
//     if (!enabled) return;

//     // Start periodic refresh
//     intervalRef.current = setInterval(() => {
//       refresh();
//     }, REFRESH_INTERVAL);

//     // Visibility change listener (more efficient than focus)
//     document.addEventListener('visibilitychange', handleVisibilityChange);

//     // Initial refresh on mount if token is old
//     const checkInitialToken = async () => {
//       // Small delay to let the app initialize
//       setTimeout(() => {
//         refresh();
//       }, 1000);
//     };
//     checkInitialToken();

//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//       }
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
//       if (refreshTimeoutRef.current) {
//         clearTimeout(refreshTimeoutRef.current);
//       }
//     };
//   }, [enabled, refresh, handleVisibilityChange]);

//   return { refresh };
// }

// Версия с исправленной ошибкой ESLint
'use client';

import { useEffect, useRef, useCallback } from 'react';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MAX_REFRESH_RETRIES = 3;
const REFRESH_COOLDOWN = 30 * 1000; // 30 seconds cooldown after failure

interface UseTokenRefreshOptions {
  onRefreshSuccess?: (accessToken: string) => void;
  onRefreshFailure?: () => void;
  enabled?: boolean;
}

export function useTokenRefresh(options?: UseTokenRefreshOptions) {
  const { onRefreshSuccess, onRefreshFailure, enabled = true } = options || {};
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const failureCountRef = useRef(0);
  // ✅ Initialize with 0 instead of Date.now()
  const lastActivityRef = useRef(0);
  const lastRefreshTimeRef = useRef(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track user activity - set initial timestamp in useEffect, not during render
  useEffect(() => {
    if (!enabled) return;

    // ✅ Set initial timestamp after mount
    lastActivityRef.current = Date.now();
    lastRefreshTimeRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('click', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('mousemove', updateActivity);

    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
    };
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    // Prevent multiple concurrent refreshes
    if (isRefreshingRef.current) {
      console.log('[TokenRefresh] Refresh already in progress, skipping');
      return false;
    }

    // Don't refresh if user has been inactive for > 5 minutes
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    if (timeSinceLastActivity > 5 * 60 * 1000 && lastActivityRef.current > 0) {
      console.log('[TokenRefresh] User inactive, skipping refresh');
      return false;
    }

    // Don't refresh too frequently (cooldown)
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    if (timeSinceLastRefresh < REFRESH_COOLDOWN && lastRefreshTimeRef.current > 0) {
      console.log('[TokenRefresh] Refresh cooldown active, skipping');
      return false;
    }

    isRefreshingRef.current = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Component might have unmounted
      if (!isMountedRef.current) {
        console.log('[TokenRefresh] Component unmounted, ignoring response');
        return false;
      }

      if (response.ok) {
        const data = await response.json();
        
        // Reset failure count on success
        failureCountRef.current = 0;
        lastRefreshTimeRef.current = Date.now();
        
        console.log('[TokenRefresh] Refresh successful');
        
        if (onRefreshSuccess) {
          onRefreshSuccess(data.accessToken);
        }
        
        return true;
      } else {
        // Handle specific status codes
        if (response.status === 401) {
          // Session expired, don't retry
          console.log('[TokenRefresh] Session expired');
          if (onRefreshFailure) {
            onRefreshFailure();
          }
          return false;
        }
        
        // Other errors (500, 503, etc.) - retry with backoff
        throw new Error(`Refresh failed with status ${response.status}`);
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return false;
      }

      console.error('[TokenRefresh] Refresh error:', error);
      
      // Retry logic for network errors
      if (failureCountRef.current < MAX_REFRESH_RETRIES) {
        failureCountRef.current++;
        
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, failureCountRef.current - 1) * 1000;
        
        console.log(`[TokenRefresh] Scheduling retry in ${backoffDelay}ms (attempt ${failureCountRef.current}/${MAX_REFRESH_RETRIES})`);
        
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        
        refreshTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            refresh();
          }
        }, backoffDelay);
        
        return false;
      } else {
        // Max retries exceeded
        console.error('[TokenRefresh] Max retries exceeded');
        if (onRefreshFailure) {
          onRefreshFailure();
        }
        return false;
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefreshSuccess, onRefreshFailure]);

  // Trigger refresh on page visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Check if we need to refresh when tab becomes visible again
      const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;
      
      // If last refresh was more than 12 minutes ago (close to 15 min expiry)
      if (timeSinceLastRefresh > 12 * 60 * 1000 && lastRefreshTimeRef.current > 0) {
        console.log('[TokenRefresh] Tab became visible, checking token validity');
        refresh();
      }
    }
  }, [refresh]);

  // Main interval setup
  useEffect(() => {
    if (!enabled) return;

    // Start periodic refresh
    intervalRef.current = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL);

    // Visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial refresh on mount if token is old
    const initialRefreshTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        refresh();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      clearTimeout(initialRefreshTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refresh, handleVisibilityChange]);

  return { refresh };
}