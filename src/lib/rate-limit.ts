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

export const RATE_LIMITS = {
  login: {
    limit: 5,
    window: '15m',
    windowMs: 15 * 60 * 1000,
    description: 'Login attempts per 15 minutes',
  },
  changePassword: {
    limit: 10,
    window: '1h',
    windowMs: 60 * 60 * 1000,
    description: 'Password change attempts per hour',
  },
  upload: {
    limit: 20,
    window: '1h',
    windowMs: 60 * 60 * 1000,
    description: 'File uploads per hour',
  },
  admin: {
    limit: 30,
    window: '15m',
    windowMs: 15 * 60 * 1000,
    description: 'Admin operations per 15 minutes',
  },
  documentApi: {
    limit: 100,
    window: '15m',
    windowMs: 15 * 60 * 1000,
    description: 'Document API calls per 15 minutes',
  },
  global: {
    limit: 200,
    window: '15m',
    windowMs: 15 * 60 * 1000,
    description: 'API calls per 15 minutes (global)',
  },
};
