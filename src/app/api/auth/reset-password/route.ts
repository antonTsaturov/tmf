// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { AuthService } from '@/lib/auth/auth.service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Verify the reset token
    const payload = AuthService.verifyResetToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await AuthService.hashPassword(newPassword);

    // Update password in database
    const pool = getPool();
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, payload.email]
    );

    logger.info(`Password reset successful for ${payload.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in reset-password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
