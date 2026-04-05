// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { AuthService } from '@/lib/auth/auth.service';
import { NotificationService } from '@/services/notification.service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({ success: true });
    }

    const user = rows[0];

    // Generate reset token (JWT with 15 min expiry)
    const resetToken = AuthService.generateResetToken(user.email);

    // Send email
    const emailSent = await NotificationService.sendPasswordResetEmail(
      user.email,
      resetToken
    );

    if (!emailSent) {
      logger.error(`Failed to send password reset email to ${user.email}`);
      // Still return success to prevent enumeration
    }

    logger.info(`Password reset email sent to ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in forgot-password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
