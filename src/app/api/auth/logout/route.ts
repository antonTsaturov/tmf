// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });

  // Очистить auth cookie
  response.cookies.delete('auth-token');

  return response;
}