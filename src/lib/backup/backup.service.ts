/**
 * Backup Service — Programmatic backup management
 *
 * Used by the API endpoint to trigger backups from the web interface.
 * Delegates to shell scripts (backup.sh / restore.sh) for actual work.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/utils/logger';

const execAsync = promisify(exec);

export interface BackupStatus {
  lastBackup: string | null;
  lastBackupSize: string;
  localBackupCount: number;
  totalLocalSize: string;
  nextScheduled: string;
  isRunning: boolean;
  recentBackups: BackupFileInfo[];
}

export interface BackupFileInfo {
  name: string;
  size: number;
  date: string;
  type: 'database' | 's3';
}

export interface BackupResult {
  success: boolean;
  message: string;
  duration: number;
  details?: {
    database?: { success: boolean; size?: string; file?: string };
    s3?: { success: boolean; fileCount?: number; size?: string };
  };
}

const SCRIPTS_DIR = process.env.BACKUP_SCRIPTS_DIR || '/scripts';
const BACKUP_DIR = process.env.BACKUP_LOCAL_DIR || '/backups';

export class BackupService {
  /**
   * Run backup.sh and return result
   */
  async runBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const scriptPath = join(SCRIPTS_DIR, 'backup.sh');

    if (!existsSync(scriptPath)) {
      return {
        success: false,
        message: `Backup script not found: ${scriptPath}`,
        duration: 0,
      };
    }

    try {
      const { stdout, stderr } = await execAsync(`bash ${scriptPath}`, {
        timeout: 30 * 60 * 1000, // 30 min timeout
        env: { ...process.env },
      });

      const duration = (Date.now() - startTime) / 1000;

      // Parse output to extract details
      const dbMatch = stdout.match(/Database backup created: (\S+) \((\S+)\)/);
      const s3Match = stdout.match(/Downloaded (\d+) files.*?(\S+)$/m);

      logger.info('Backup completed successfully', {
        duration,
        database: dbMatch ? { file: dbMatch[1], size: dbMatch[2] } : undefined,
      });

      return {
        success: true,
        message: 'Backup completed successfully',
        duration,
        details: {
          database: dbMatch
            ? { success: true, file: dbMatch[1], size: dbMatch[2] }
            : { success: true },
          s3: s3Match
            ? { success: true, fileCount: parseInt(s3Match[1]), size: s3Match[2] }
            : { success: true },
        },
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const stderr = (error as any).stderr || '';

      logger.error('Backup failed', error instanceof Error ? error : null, {
        duration,
        stderr,
      });

      return {
        success: false,
        message: `Backup failed: ${stderr.split('\n').filter((l: string) => l.includes('ERROR')).join('; ') || 'Unknown error'}`,
        duration,
      };
    }
  }

  /**
   * Get backup status for dashboard
   */
  getBackupStatus(): BackupStatus {
    const dbDir = join(BACKUP_DIR, 'db');
    const s3Dir = join(BACKUP_DIR, 's3');

    const dbFiles = this.listFiles(dbDir, '.gz');
    const s3Files = this.listFiles(s3Dir, '.tar.gz');

    const allBackups = [...dbFiles, ...s3Files].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const lastBackup = allBackups[0] || null;
    const totalSize = [...dbFiles, ...s3Files].reduce((sum, f) => sum + f.size, 0);

    // Check if backup is currently running
    const isRunning = this.isBackupRunning();

    return {
      lastBackup: lastBackup?.date || null,
      lastBackupSize: lastBackup ? this.formatSize(lastBackup.size) : '—',
      localBackupCount: allBackups.length,
      totalLocalSize: this.formatSize(totalSize),
      nextScheduled: 'Every day at 03:00 (cron)',
      isRunning,
      recentBackups: allBackups.slice(0, 10),
    };
  }

  /**
   * Delete old backups (manual cleanup)
   */
  cleanup(olderThanDays: number = 7): { removed: number; message: string } {
    const dbDir = join(BACKUP_DIR, 'db');
    const s3Dir = join(BACKUP_DIR, 's3');
    let removed = 0;
    const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    for (const dir of [dbDir, s3Dir]) {
      if (!existsSync(dir)) continue;

      const files = readdirSync(dir);
      for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        if (stat.mtimeMs < cutoffDate) {
          require('fs').unlinkSync(filePath);
          removed++;
        }
      }
    }

    return {
      removed,
      message: `Removed ${removed} backup(s) older than ${olderThanDays} days`,
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────

  private listFiles(dir: string, extension: string): BackupFileInfo[] {
    if (!existsSync(dir)) return [];

    return readdirSync(dir)
      .filter((f) => f.endsWith(extension))
      .map((file) => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2}_\d{6})/);

        return {
          name: file,
          size: stat.size,
          date: dateMatch ? dateMatch[1] : stat.mtime.toISOString(),
          type: extension.includes('tar') ? 's3' : 'database',
        };
      });
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private isBackupRunning(): boolean {
    // Check for lock file
    const lockFile = join(BACKUP_DIR, '.backup.lock');
    if (!existsSync(lockFile)) return false;

    const lockAge = Date.now() - statSync(lockFile).mtimeMs;
    // If lock is older than 2 hours, it's stale
    if (lockAge > 2 * 60 * 60 * 1000) return false;

    return true;
  }
}

// Singleton
export const backupService = new BackupService();
