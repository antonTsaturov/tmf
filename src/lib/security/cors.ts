/**
 * 🌐 CORS (CROSS-ORIGIN RESOURCE SHARING) CONFIGURATION
 * 
 * Defines which origins can access the API and what methods/headers are allowed.
 * This protects against unauthorized cross-origin requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

/**
 * Allowed origins for CORS requests
 * In production, explicitly whitelist your frontend domains
 */
export function getAllowedOrigins(): string[] {
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'development') {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
    ];
  }

  // Production: whitelist specific domains
  const prodOrigins = process.env.CORS_ORIGINS?.split(',') || [];
  
  if (prodOrigins.length === 0) {
    logger.warn('No CORS_ORIGINS configured in production', {
      note: 'Set CORS_ORIGINS=https://yourapp.com,https://sub.yourapp.com',
    });
  }

  return prodOrigins;
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  
  // Allow any origin in development for testing
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // In production, check against whitelist
  return allowedOrigins.includes(origin);
}

/**
 * CORS configuration object
 */
export const corsConfig = {
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed request headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'X-API-Key',
  ],

  // Headers that can be accessed by the requester
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Window-Ms',
    'Retry-After',
    'X-Total-Count', // For pagination
  ],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Cache OPTIONS requests for 24 hours
  maxAge: 86400,
};

/**
 * Apply CORS headers to response
 * Called from middleware or route handlers
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    response.headers.set('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());
  } else if (origin) {
    logger.warn('CORS_ORIGIN_NOT_ALLOWED', {
      origin,
      allowedOrigins: getAllowedOrigins(),
    });
  }

  return response;
}

/**
 * Handle CORS preflight requests (OPTIONS method)
 * Returns 204 No Content with appropriate headers
 */
export function handleCorsPreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');

  if (!origin || !isOriginAllowed(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(request, response);
}

/**
 * Example usage in API route:
 *
 * ```typescript
 * import { applyCorsHeaders, handleCorsPreflight } from '@/lib/security/cors';
 *
 * export async function OPTIONS(request: NextRequest) {
 *   return handleCorsPreflight(request);
 * }
 * 
 * export async function GET(request: NextRequest) {
 *   // Your logic here
 *   let response = NextResponse.json({ data: '...' });
 *   return applyCorsHeaders(request, response);
 * }
 * ```
 * 
 * Configuration:
 * 
 * Environment variables (.env.local):
 * - CORS_ORIGINS: Comma-separated list of allowed origins (production only)
 *   Example: CORS_ORIGINS=https://myapp.com,https://admin.myapp.com
 * 
 * Development:
 * - Automatically allows: localhost:3000, localhost:3001, 127.0.0.1:3000
 */
