// lib/auth/check-auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth.service';
import { connectDB } from '@/lib/db/index';

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

  const client = await connectDB();
  try {
    const result = await client.query(
      `SELECT id, name, email, role, assigned_site_id, assigned_study_id, status 
       FROM users 
       WHERE id = $1`,
      [payload.id]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}