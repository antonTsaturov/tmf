// app/api/auth/check/route.ts 
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { getPool } from '@/lib/db/index';
import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/utils/logger';
import { SESSION_CONFIG } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;

  if (!authToken) {
    return NextResponse.json({ user: null, sessionExpired: false });
  }

  const payload = AuthService.verifyToken(authToken);
  if (!payload) {
    // Токен невалиден, удаляем cookie
    const response = NextResponse.json({ user: null, sessionExpired: true });
    response.cookies.delete('auth-token');
    return response;
  }

  let session = null;
  if (payload.sessionId) {
    session = await getSession(payload.sessionId);
  }

  // ✅ Сессия истекла - сообщаем клиенту
  if (!session) {
    const response = NextResponse.json({ 
      user: null, 
      sessionExpired: true,
      message: 'Session expired' 
    });
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    return response;
  }

  const client = getPool();

  try {
    const result = await client.query(
      `SELECT id, 
              name, 
              email, 
              role, 
              assigned_site_id, 
              assigned_study_id, 
              assigned_country_by_study,
              email_notifications_enabled
       FROM users
       WHERE id = $1 AND status = 'active'`,
      [payload.id]
    );

    const user = result.rows[0];

    if (!user) {
      const response = NextResponse.json({ user: null, sessionExpired: true });
      response.cookies.delete('auth-token');
      response.cookies.delete('refresh-token');
      return response;
    }

    // Вычисляем время до истечения сессии
    const now = Date.now();
    const idleTime = now - session.lastActivityAt;
    const sessionDuration = SESSION_CONFIG.IDLE_TIMEOUT;
    const idleTimeLeftMs = Math.max(0, sessionDuration - idleTime);
    const idleTimeLeftSeconds = Math.floor(idleTimeLeftMs / 1000);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assigned_site_id: user.assigned_site_id,
        assigned_study_id: user.assigned_study_id,
        assigned_country_by_study: user.assigned_country_by_study,
        email_notifications_enabled: user.email_notifications_enabled,
      },
      session: {
        idleTimeLeft: idleTimeLeftSeconds,
      },
      sessionExpired: false,
    });
  } catch (error) {
    logger.error('Error checking auth:', error);
    return NextResponse.json(
      { user: null, error: 'Failed to check authentication' },
      { status: 500 }
    );
  }
}