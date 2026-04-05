/**
 * POST /api/auth/logout
 * 
 * Logout user and invalidate session
 * - Invalidates authentication token
 * - Clears session from session store
 * - Removes all auth cookies
 * 
 * Response: { success: true, message: "Logged out successfully" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { invalidateSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Get session ID from auth token cookie
    const authToken = request.cookies.get('auth-token')?.value;

    let userId: number | null = null;
    let sessionId: string | null = null;

    if (authToken) {
      const payload = AuthService.verifyAccessToken(authToken);
      if (payload) {
        userId = payload.id;
        sessionId = payload.sessionId || null;
      } else {
        // Token expired — decode without verification to get sessionId
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(authToken) as { sessionId?: string; id?: number } | null;
        if (decoded) {
          sessionId = decoded.sessionId || null;
          userId = decoded.id || null;
        }
      }
    }

    // Invalidate session
    if (sessionId) {
      const invalidated = invalidateSession(sessionId);

      if (invalidated && userId) {
        logger.authLog('LOGOUT_SUCCESS', userId.toString(), 'Session invalidated', {
          sessionId: sessionId.substring(0, 20),
        });
      }
    } else if (userId) {
      logger.authLog('LOGOUT_NO_SESSION', userId.toString());
    }

    // Clear auth cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });

    // Clear all auth-related cookies
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    response.cookies.set('session_id', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('LOGOUT_ERROR', error);

    // Still clear cookies even if error occurs
    const response = NextResponse.json({
      success: true,
      message: 'Logged out (with errors)'
    }, { status: 200 });

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  }
}

/**
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
  });
}