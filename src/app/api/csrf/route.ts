/**
 * GET /api/csrf
 * 
 * Endpoint for generating CSRF tokens
 * clients should call this before making state-changing requests
 * 
 * Response: { token: string, expiresAt: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCsrfToken } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * GET handler: Generate CSRF token
 */
export async function GET(request: NextRequest) {
  try {
    // Get or create session ID from cookie
    let sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
      // Generate new session ID for first-time visitors
      sessionId = crypto.randomUUID();
    }

    // Create CSRF token for session
    const { token, expiresAt } = createCsrfToken(sessionId);

    logger.apiLog('GET', '/api/csrf', 200, {
      expiresIn: Math.round((expiresAt - Date.now()) / 1000),
    });

    // Create response
    const response = new NextResponse(
      JSON.stringify({
        token,
        expiresAt,
        expiresIn: Math.round((expiresAt - Date.now()) / 1000),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Set session cookie if new session
    if (!request.cookies.get('session_id')) {
      response.cookies.set('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }

    return response;
  } catch (error) {
    logger.error('CSRF_TOKEN_GENERATION_FAILED', error);

    return new NextResponse(
      JSON.stringify({ error: 'Failed to generate CSRF token' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Client-side usage in React component:
 * 
 * Step 1: Create hook to fetch CSRF token
 *   useEffect(() => {
 *     fetch('/api/csrf')
 *       .then(r => r.json())
 *       .then(data => setToken(data.token));
 *   }, []);
 * 
 * Step 2: Include token in POST requests
 *   const response = await fetch('/api/action', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'X-CSRF-Token': csrfToken
 *     },
 *     body: JSON.stringify(payload),
 *     credentials: 'include'
 *   });
 * 
 * Step 3: Validate token in API route
 *   const csrf = await requireCsrfToken(request, sessionId);
 *   if (!csrf.valid) {
 *     return new NextResponse('CSRF validation failed', { 
 *       status: csrf.statusCode 
 *     });
 *   }
 */

