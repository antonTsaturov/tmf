/**
 * POST /api/auth/refresh
 * 
 * Refresh access token using refresh token
 * 
 * Request body:
 * {
 *   "refreshToken": "..."
 * }
 * 
 * Response:
 * {
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresIn": 900
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService, type RefreshTokenPayload, type JwtPayload } from '@/lib/auth/auth.service';
import { updateSessionActivity, getSession, verifyRefreshToken } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return new NextResponse(
        JSON.stringify({ error: 'Refresh token required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify refresh token
    const payload = AuthService.verifyRefreshToken(refreshToken);
    if (!payload) {
      logger.authLog('REFRESH_TOKEN_INVALID', undefined, 'Invalid refresh token', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      
      return new NextResponse(
        JSON.stringify({ error: 'Invalid refresh token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get session and verify
    const session = getSession(payload.sessionId);
    if (!session) {
      logger.authLog('REFRESH_TOKEN_SESSION_EXPIRED', payload.id.toString(), 'Session expired', {
        sessionId: payload.sessionId,
      });
      
      return new NextResponse(
        JSON.stringify({ error: 'Session expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify refresh token hash matches stored value
    try {
      if (!AuthService.verifyRefreshTokenHash(refreshToken, session.refreshTokenHash)) {
        logger.authLog('REFRESH_TOKEN_MISMATCH', payload.id.toString(), 'Token mismatch', {
          sessionId: payload.sessionId,
        });
        
        return new NextResponse(
          JSON.stringify({ error: 'Invalid refresh token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      logger.warn('REFRESH_TOKEN_VERIFICATION_FAILED', { error });
      return new NextResponse(
        JSON.stringify({ error: 'Token verification failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update session activity
    updateSessionActivity(payload.sessionId);

    // Generate new tokens
    const accessTokenPayload: JwtPayload = {
      id: payload.id,
      email: payload.email,
      role: 'user', // You'll need to fetch actual role from DB
      study_id: [],
      assigned_site_id: [],
      sessionId: payload.sessionId,
    };

    const newAccessToken = AuthService.generateAccessToken(accessTokenPayload);
    const newRefreshToken = AuthService.generateRefreshToken({
      id: payload.id,
      email: payload.email,
      sessionId: payload.sessionId,
      tokenVersion: payload.tokenVersion,
    });

    logger.authLog('REFRESH_TOKEN_SUCCESS', payload.id.toString(), 'Token refreshed', {
      sessionId: payload.sessionId,
    });

    // Set new access token in cookie (refresh token stays the same)
    const response = new NextResponse(
      JSON.stringify({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

    // Update auth-token cookie with new access token
    response.cookies.set('auth-token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('REFRESH_TOKEN_ERROR', error);
    
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Client-side usage (React hook):
 * 
 * ```typescript
 * export function useTokenRefresh() {
 *   const refresh = async (refreshToken: string) => {
 *     const response = await fetch('/api/auth/refresh', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ refreshToken }),
 *       credentials: 'include'
 *     });
 *     
 *     if (response.ok) {
 *       const data = await response.json();
 *       // Store new tokens
 *       localStorage.setItem('refreshToken', data.refreshToken);
 *       return data.accessToken;
 *     }
 *     
 *     return null;
 *   };
 *   
 *   return { refresh };
 * }
 * ```
 */
