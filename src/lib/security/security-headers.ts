/**
 * 🔒 SECURITY HEADERS CONFIGURATION
 * 
 * Implements Helmet.js for essential HTTP security headers protection:
 * - Content Security Policy (CSP)
 * - X-Frame-Options (clickjacking protection)
 * - X-Content-Type-Options (MIME type sniffing)
 * - Strict-Transport-Security (HTTPS enforcement)
 * - And more...
 */

export const securityHeaders = {
  // Content Security Policy - Prevents XSS and data injection attacks
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
    "style-src 'self' 'unsafe-inline'", // Needed for inline styles
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'self' blob:; ",  // Разрешает <object data="blob:...">
    "frame-src 'self' blob:; ",   // Разрешает <iframe> со ссылками blob:    
    "worker-src 'self' blob:",
    "child-src 'self' blob:",    
  ].join('; '),

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking attacks
  'X-Frame-Options': 'SAMEORIGIN',

  // Enable XSS protection in older browsers
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (formerly Feature Policy)
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),
};

/**
 * Get security headers for production environment
 * HSTS header should only be sent over HTTPS (production only)
 */
export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...securityHeaders };

  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] =
      'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Helmet.js Configuration for Next.js
 * Applied via middleware or next.config.ts
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'self'", "blob:"], // Добавлено для Helmet для просмотра PDF в браузере
      frameSrc: ["'self'", "blob:"],  // Добавлено для Helmet для просмотра PDF в браузере
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Can interfere with some resources
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
};

/**
 * Security Headers Summary
 * 
 * Header                           Purpose                              Value
 * ────────────────────────────────────────────────────────────────────────────
 * Content-Security-Policy          XSS and injection prevention         See above
 * X-Content-Type-Options           MIME sniffing prevention            nosniff
 * X-Frame-Options                  Clickjacking protection             DENY
 * X-XSS-Protection                 XSS protection (legacy)             1; mode=block
 * Referrer-Policy                  Control referrer info               strict-origin-when-cross-origin
 * Permissions-Policy               Feature policy enforcement          <see above>
 * Strict-Transport-Security        Force HTTPS (production only)       max-age=31536000
 */
