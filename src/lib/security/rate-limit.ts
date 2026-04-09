/**
 * 🚦 NEXT.JS ROUTE HANDLER WRAPPER FOR RATE LIMITING
 *
 * Since Next.js API routes don't support Express middleware directly,
 * this wrapper function allows applying rate limiters to route handlers.
 *
 * Usage:
 * ```
 * import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/security/rate-limit';
 *
 * export async function POST(request: NextRequest) {
 *   return applyRateLimit(RATE_LIMIT_PRESETS.login, request, async () => {
 *     // Your route logic here
 *   });
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Get client IP from Next.js request
 * Handles proxied requests and various header formats
 */
export function getClientIpFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  // Fall back to using the request's connection info
  // Note: This might not work in all environments
  return 'unknown';
}

/**
 * In-memory store for tracking rate limits
 * Structure: { ip -> { count, resetTime } }
 * 
 * Note: For production with multiple servers, use Redis instead:
 * - Redis provides shared state across servers
 * - Better performance and reliability
 * - Supports distributed systems
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check and update rate limit for a client IP
 * Returns true if within limit, false if exceeded
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window or first request
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  entry.count++;
  return { allowed: true };
}

/**
 * Cleanup old entries from rate limit store
 * Prevents memory leak from accumulating entries
 * Called periodically
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every hour
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);

/**
 * Wrap a route handler with rate limiting
 * 
 * @param limiter - Configuration object with limit and windowMs
 * @param request - The incoming request
 * @param handler - The actual route handler function
 * 
 * Example:
 * ```
 * const limiter = {
 *   limit: 5,
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   name: 'login',
 * };
 * 
 * const result = await applyRateLimit(limiter, request, async () => {
 *   // Your route logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export async function applyRateLimit(
  limiter: {
    limit: number;
    windowMs: number;
    name?: string;
  },
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return handler();
  }

  const clientIp = getClientIpFromRequest(request);
  const limiterName = limiter.name || 'api';
  const key = `${clientIp}:${limiterName}`;

  const result = checkRateLimit(key, limiter.limit, limiter.windowMs);

  if (!result.allowed) {
    const retryAfter = result.retryAfter || Math.ceil(limiter.windowMs / 1000);
    const windowMinutes = Math.ceil(limiter.windowMs / 60000);

    logger.warn(`${limiterName.toUpperCase()}_RATE_LIMIT_EXCEEDED`, {
      ip: clientIp,
      method: request.method,
      path: request.nextUrl.pathname,
      retryAfter,
    });

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${windowMinutes} minute(s).`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limiter.limit.toString(),
          'X-RateLimit-Window-Ms': limiter.windowMs.toString(),
        },
      }
    );
  }

  // Within rate limit, execute handler
  const response = await handler();

  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Limit', limiter.limit.toString());
  response.headers.set('X-RateLimit-Window-Ms', limiter.windowMs.toString());

  return response;
}

/**
 * Configuration presets for common rate limits
 */
export const RATE_LIMIT_PRESETS = {
  login: {
    limit: 5,
    window: '15m',    
    windowMs: 15 * 60 * 1000, // 15 minutes
    name: 'login',
    
  },
  changePassword: {
    limit: 10,
    window: '1h',
    windowMs: 60 * 60 * 1000, // 1 hour
    name: 'changePassword',
  },
  upload: {
    limit: 20,
    window: '1h',
    windowMs: 60 * 60 * 1000, // 1 hour
    name: 'upload',
  },
  admin: {
    limit: 30,
    window: '15m',    
    windowMs: 15 * 60 * 1000, // 15 minutes
    name: 'admin',
  },
  documentApi: {
    limit: 100,
    window: '15m',    
    windowMs: 15 * 60 * 1000, // 15 minutes
    name: 'documentApi',
  },
  general: {
    limit: 200,
    window: '15m',    
    windowMs: 15 * 60 * 1000, // 15 minutes
    name: 'general',
  },
  global: {
    limit: 200,
    window: '15m',
    windowMs: 15 * 60 * 1000,
  },

};

/**
 * 🚦 RATE LIMITING CONFIGURATION
 * 
 * Prevents abuse and DoS attacks by limiting request rate per IP address.
 * Different strategies for different endpoint types:
 * 
 * - Auth endpoints (login, signup): Very strict (5 requests per 15 minutes)
 * - General API: Moderate (100 requests per 15 minutes)
 * - Public endpoints: Lenient (1000 requests per 15 minutes)
 */

/**
 * Rate Limit Summary by Endpoint Type
 * 
 * │ Endpoint Type           │ Limit  │ Window │ Protection Priority │
 * ├─────────────────────────┼────────┼────────┼────────────────────┤
 * │ Login (/auth/login)     │ 5      │ 15m   │ Critical (brute force) │
 * │ Change Password         │ 10     │ 1h    │ Critical            │
 * │ File Upload             │ 20     │ 1h    │ High (bandwidth)    │
 * │ Admin Operations        │ 30     │ 15m   │ High                │
 * │ Document API (general)  │ 100    │ 15m   │ Medium              │
 * │ Global API (catch-all)  │ 200    │ 15m   │ Low                 │
 * 
 * Monitoring:
 * - All rate limit violations logged with IP and timestamp
 * - 429 (Too Many Requests) HTTP status returned
 * - Retry-After header included in response
 * - Development mode (NODE_ENV=development) skips rate limiting
 */