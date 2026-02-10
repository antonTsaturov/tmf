// app/api/auth/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth.service';
import { connectDB } from '@/lib/db/index';

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const client = await connectDB();

  if (!authToken) {
    return NextResponse.json({ user: null });
  }

  const payload = AuthService.verifyToken(authToken);

  if (!payload) {
    return NextResponse.json({ user: null });
  }

  // Получить свежую информацию о пользователе из БД
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
      study_id: user.study_id
    }
  });
}