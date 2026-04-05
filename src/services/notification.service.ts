// services/notification.service.ts
import { getPool } from '@/lib/db';
import { EmailService } from '@/lib/email/email.service';
import { DocumentInfo } from '@/lib/email/types';
import { logger } from '@/lib/logger';

export interface StudyUser {
  id: number;
  email: string;
  name: string;
  role: string[];
}

export class NotificationService {
  /**
   * Get all users associated with a study
   */
  private static async getStudyUsers(studyId: string): Promise<StudyUser[]> {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT DISTINCT u.id, u.email, u.name, u.role
         FROM users u
         INNER JOIN study_users su ON u.id = su.user_id
         WHERE su.study_id = $1`,
        [studyId]
      );
      return rows;
    } catch (error) {
      logger.error('Error fetching study users:', error);
      return [];
    }
  }

  /**
   * Get users with specific role for a study
   */
  private static async getStudyUsersByRole(studyId: string, role: string): Promise<StudyUser[]> {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT DISTINCT u.id, u.email, u.name, u.role
         FROM users u
         INNER JOIN study_users su ON u.id = su.user_id
         WHERE su.study_id = $1 AND $2 = ANY(u.role)`,
        [studyId, role]
      );
      return rows;
    } catch (error) {
      logger.error('Error fetching study users by role:', error);
      return [];
    }
  }

  /**
   * Notify all study users about new document upload
   */
  static async notifyNewDocument(
    studyId: string,
    documentInfo: Omit<DocumentInfo, 'studyTitle'>
  ): Promise<void> {
    try {
      // Get study title
      const pool = getPool();
      const { rows: studyRows } = await pool.query(
        'SELECT title FROM studies WHERE id = $1',
        [studyId]
      );

      if (studyRows.length === 0) {
        logger.warn(`Study ${studyId} not found for notification`);
        return;
      }

      const studyTitle = studyRows[0].title;
      const users = await this.getStudyUsers(studyId);
      const emailService = EmailService.getInstance();

      for (const user of users) {
        // Don't notify the uploader
        if (user.name === documentInfo.uploadedBy) continue;

        await emailService.sendNewDocumentNotification({
          to: user.email,
          recipientName: user.name,
          documents: [{ ...documentInfo, studyTitle }],
        });
      }
    } catch (error) {
      logger.error('Error sending new document notifications:', error);
    }
  }

  /**
   * Notify reviewers about documents pending review
   */
  static async notifyDocumentReview(
    studyId: string,
    documentInfo: Omit<DocumentInfo, 'studyTitle'>,
    reviewerIds: number[],
    deadline?: string,
    comments?: string
  ): Promise<void> {
    try {
      // Get study title
      const pool = getPool();
      const { rows: studyRows } = await pool.query(
        'SELECT title FROM studies WHERE id = $1',
        [studyId]
      );

      if (studyRows.length === 0) {
        logger.warn(`Study ${studyId} not found for review notification`);
        return;
      }

      const studyTitle = studyRows[0].title;
      const emailService = EmailService.getInstance();

      // Get reviewers by their IDs
      const { rows: reviewers } = await pool.query(
        'SELECT id, email, name, role FROM users WHERE id = ANY($1)',
        [reviewerIds]
      );

      for (const reviewer of reviewers) {
        await emailService.sendDocumentReviewRequest({
          to: reviewer.email,
          recipientName: reviewer.name,
          documents: [{ ...documentInfo, studyTitle }],
          reviewDeadline: deadline,
          comments,
        });
      }
    } catch (error) {
      logger.error('Error sending document review notifications:', error);
    }
  }

  /**
   * Notify user about account creation with login link
   */
  static async sendWelcomeEmail(
    email: string,
    name: string,
    temporaryPassword: string
  ): Promise<boolean> {
    try {
      const loginUrl = `${process.env.APP_URL || 'http://localhost:3000'}/login`;
      const emailService = EmailService.getInstance();

      return await emailService.sendWelcomeEmail({
        email,
        loginUrl,
        temporaryPassword,
        userName: name,
      });
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Notify user about password reset
   */
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<boolean> {
    try {
      const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const emailService = EmailService.getInstance();

      return await emailService.sendResetPasswordEmail({
        to: email,
        resetUrl,
        expiryMinutes: 15,
      });
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return false;
    }
  }
}
