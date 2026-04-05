/**
 * POST /api/admin/backup/run    — Trigger backup manually
 * GET  /api/admin/backup/status — Get backup status
 * POST /api/admin/backup/cleanup — Delete old backups
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getAuthenticatedUser } from '@/lib/auth/check-auth';
import { backupService } from '@/lib/backup/backup.service';
import { logger } from '@/lib/logger';

// ─── Admin check helper ──────────────────────────────────────────────────────
async function requireAdmin(request: NextRequest): Promise<{ authenticated: boolean; response?: NextResponse }> {
  const auth = await checkAuth(request);
  if (!auth.authenticated) {
    return auth;
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 401 }),
    };
  }

  const roles = Array.isArray(user.role) ? user.role : [user.role];
  const isAdmin = roles.includes('admin') || roles.includes('ADMIN');

  if (!isAdmin) {
    logger.authError('BACKUP_ACCESS_DENIED', user.id, 'Non-admin attempted to access backup management');
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 }),
    };
  }

  return { authenticated: true };
}

// ─── POST: Run backup ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authenticated) {
      return auth.response;
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'run';

    if (action === 'cleanup') {
      const days = parseInt(url.searchParams.get('older_than') || '7');
      const result = backupService.cleanup(days);

      return NextResponse.json({
        success: true,
        action: 'cleanup',
        ...result,
      });
    }

    // Default: run backup
    const result = await backupService.runBackup();

    return NextResponse.json({
      success: result.success,
      action: 'backup',
      message: result.message,
      duration: `${result.duration}s`,
      details: result.details,
    }, { status: result.success ? 200 : 500 });
  } catch (error) {
    logger.error('Backup API error', error instanceof Error ? error : null);

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

// ─── GET: Backup status ──────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authenticated) {
      return auth.response;
    }

    const status = backupService.getBackupStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error('Backup status API error', error instanceof Error ? error : null);

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}
