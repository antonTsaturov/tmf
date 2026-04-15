// app/api/user/email-notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/index';
import { checkAuth } from '@/lib/auth/check-auth';
import { logger } from '@/lib/utils/logger';

export async function PATCH(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const client = getPool();

  try {
    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid value: enabled must be a boolean' },
        { status: 400 }
      );
    }

    await client.query(
      `UPDATE users
       SET email_notifications_enabled = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [enabled, auth.payload?.id]
    );

    return NextResponse.json(
      {
        message: 'Email notification preference updated',
        enabled,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Update email notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
