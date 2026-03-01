// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  });

  // Очистка cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    expires: new Date(0), // Явное истечение срока действия
    path: '/',
  });
  
  return response;
}