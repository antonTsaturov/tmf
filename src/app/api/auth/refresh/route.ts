/**
 * POST /api/auth/refresh
 *
 * Refresh access token using the current session.
 * The client sends the existing access token via cookies (auth-token).
 * The server extracts sessionId from the token (even if expired),
 * verifies the session is still active, and issues a new access token.
 *
 * Response:
 * {
 *   "accessToken": "...",
 *   "expiresIn": 900
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, type JwtPayload } from '@/lib/auth/auth.service';
import { updateSessionActivity, getSession } from '@/lib/auth/session';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Get the current access token from cookie
    const authToken = request.cookies.get('auth-token')?.value;

    if (!authToken) {
      logger.authLog('REFRESH_NO_COOKIE', undefined, 'No auth-token cookie found', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return new NextResponse(
        JSON.stringify({ error: 'No authentication token provided' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try to verify the access token first (might still be valid)
    let sessionId: string | null = null;
    let userId: number | null = null;

    const validPayload = AuthService.verifyAccessToken(authToken);
    if (validPayload) {
      sessionId = validPayload.sessionId || null;
      userId = validPayload.id;
    } else {
      // Token expired — decode without verification to extract sessionId
      try {
        const decoded = jwt.decode(authToken) as { sessionId?: string; id?: number } | null;
        if (decoded) {
          sessionId = decoded.sessionId || null;
          userId = decoded.id || null;
        }
      } catch {
        // ignore decode errors
      }
    }

    if (!sessionId) {
      logger.authLog('REFRESH_NO_SESSION', userId?.toString() || 'unknown', 'No sessionId in token', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return new NextResponse(
        JSON.stringify({ error: 'No session found in token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify session is still active (not invalidated, not idle-timed-out)
    const session = getSession(sessionId);
    if (!session) {
      logger.authLog('REFRESH_SESSION_EXPIRED', userId?.toString() || 'unknown', 'Session expired or invalid', {
        sessionId: sessionId.substring(0, 20),
      });

      return new NextResponse(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update session activity
    updateSessionActivity(sessionId);

    // Fetch user role from database
    let userRole = 'user';
    try {
      const client = getPool();
      const result = await client.query(
        `SELECT role FROM users WHERE id = $1`,
        [session.userId]
      );

      if (result.rows[0]) {
        userRole = result.rows[0].role;
      }
    } catch (error) {
      logger.warn('Failed to fetch user role during refresh', { userId: session.userId, error });
    }

    // Generate new access token
    const accessTokenPayload: JwtPayload = {
      id: session.userId,
      email: session.userEmail,
      role: userRole,
      study_id: [],
      assigned_site_id: [],
      sessionId: session.sessionId,
    };

    const newAccessToken = AuthService.generateAccessToken(accessTokenPayload);

    logger.authLog('REFRESH_SUCCESS', session.userId.toString(), 'Token refreshed', {
      sessionId: sessionId.substring(0, 20),
    });

    // Set new access token in cookie
    const response = new NextResponse(
      JSON.stringify({
        accessToken: newAccessToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

    response.cookies.set('auth-token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('REFRESH_ERROR', error);

    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
