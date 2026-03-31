// app/api/auth/check/route.ts
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { getPool } from '@/lib/db/index';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;

  // Если токена нет или он невалиден — сразу возвращаем user: null,
  // не трогая базу (и не создавая лишних соединений)
  if (!authToken) {
    return NextResponse.json({ user: null });
  }

  const payload = AuthService.verifyToken(authToken);
  if (!payload) {
    return NextResponse.json({ user: null });
  }

  const client = getPool();

  try {
    const result = await client.query(
      `SELECT id, name, email, role, assigned_site_id, assigned_study_id
       FROM users
       WHERE id = $1`,
      [payload.id]
    );

    const user = result.rows[0];

    if (!user) {
      const response = NextResponse.json({ user: null });
      response.cookies.delete('auth-token');
      return response;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assigned_site_id: user.assigned_site_id,
        assigned_study_id: user.assigned_study_id,
      },
    });
  } catch (error) {
    logger.error('Error checking auth:', error);
    return NextResponse.json({ user: null, error: 'Failed to check authentication' }, { status: 500 });
  }
}