// services/digest.service.ts

import { getDailyDigest } from '@/lib/email/getDailyDigest';
import { EmailService } from '@/lib/email/email.service';
import { getPool } from '@/lib/db';
import { logger } from '@/lib/utils/logger';

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
      try {
        const lastDigest =
          user.last_digest_at || new Date(Date.now() - 24 * 60 * 60 * 1000);

        console.log(`[Digest] Обработка пользователя: ${user.email}`);
        const digest = await getDailyDigest(user.id, lastDigest);

        const total =
          digest.newDocuments.length +
          digest.updatedDocuments.length +
          digest.archivedDocuments.length;

        if (total === 0) {
          console.log(`[Digest] Пропуск ${user.email}: обновлений нет.`);
          continue;
        };

        console.log(`[Digest] Отправка ${total} обновлений на ${user.email}...`);

        const sent = await emailService.sendDailyDigest({
          userId: user.id,
          to: user.email,
          userName: user.name,
          ...digest,
        });

        if (sent) {
            console.log(`[Digest] Успешно отправлено для ${user.email}`);
        } else {
            console.error(`[Digest] Ошибка отправки для ${user.email}`);
        }        

        await pool.query(
          `UPDATE users SET last_digest_at = NOW() WHERE id = $1`,
          [user.id]
        );
      } catch (error) {
        logger.error(`Digest send failed for user ${user.email}`, error);
      }
    }
  }
}