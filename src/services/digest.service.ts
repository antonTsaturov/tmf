// services/digest.service.ts

import { getDailyDigest } from '@/lib/email/getDailyDigest';
import { EmailService } from '@/lib/email/email.service';
import { getPool } from '@/lib/db';

export class DigestService {
  static async sendDailyDigests() {
    const pool = getPool();
    const emailService = EmailService.getInstance();

    const { rows: users } = await pool.query(`
      SELECT id, email, name, last_digest_at
      FROM users
      WHERE email IS NOT NULL
    `);

    for (const user of users) {
      const lastDigest =
        user.last_digest_at || new Date(Date.now() - 24 * 60 * 60 * 1000);

      const digest = await getDailyDigest(user.id, lastDigest);

      const total =
        digest.newDocuments.length +
        digest.updatedDocuments.length +
        digest.archivedDocuments.length;

      if (total === 0) continue;

      await emailService.sendDailyDigest({
        to: user.email,
        userName: user.name,
        ...digest,
      });

      await pool.query(
        `UPDATE users SET last_digest_at = NOW() WHERE id = $1`,
        [user.id]
      );
    }
  }
}