// lib/auth/check-auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth.service';
import { getPool } from '@/lib/db/index';
import { updateSessionActivity } from './session';
import { logger } from '@/lib/utils/logger';

export async function checkAuth(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;

  if (!authToken) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    };
  }

  const payload = AuthService.verifyToken(authToken);
  if (!payload) {
    const response = NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    response.cookies.delete('auth-token');
    return { authenticated: false, response };
  }

  return { authenticated: true, payload };
}

export async function getAuthenticatedUser(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;

  if (!authToken) return null;

  const payload = AuthService.verifyToken(authToken);
  if (!payload) return null;

  // Обновляем активность сессии при каждом реальном API-запросе
  if (payload.sessionId) {
    updateSessionActivity(payload.sessionId);
  }

  const client = getPool();
  try {
    const result = await client.query(
      `SELECT id, name, email, role, assigned_site_id, assigned_study_id, assigned_country_by_study, status
       FROM users
       WHERE id = $1`,
      [payload.id]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('getAuthenticatedUser error: ', error)
  }
}