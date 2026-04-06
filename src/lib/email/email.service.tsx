// lib/email/email.service.tsx
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { WelcomeEmail } from './templates/welcome';
import { ResetPasswordEmail } from './templates/reset-password';
import { NewDocumentEmail } from './templates/new-document';
import { DocumentReviewEmail } from './templates/document-review';
import { DigestEmail } from './templates/digest-email';
import {
  WelcomeEmailData,
  ResetPasswordEmailData,
  DocumentNotificationEmailData,
  DocumentReviewEmailData,
  EmailSendOptions
} from './types';
import { logger } from '@/lib/utils/logger';

export class EmailService {
  private static instance: EmailService;
  private resend: Resend;
  private fromEmail: string;

  private constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@etmf.com';
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private async sendEmail(options: EmailSendOptions): Promise<boolean> {
    try {
      const html = await render(options.react);

      const { data, error } = await this.resend.emails.send({
        from: `ExploreTMF <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html,
      });

      if (error) {
        logger.error('Failed to send email:', error);
        return false;
      }

      logger.info('Email sent successfully:', data?.id);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const subject = 'Welcome to ExploreTMF - Your Account Has Been Created';
    const react = <WelcomeEmail {...data} />;

    return this.sendEmail({
      to: data.email,
      subject,
      react,
    });
  }

  async sendResetPasswordEmail(data: ResetPasswordEmailData): Promise<boolean> {
    const subject = 'Reset Your ExploreTMF Password';
    const react = <ResetPasswordEmail {...data} />;

    return this.sendEmail({
      to: data.to,
      subject,
      react,
    });
  }

  async sendNewDocumentNotification(data: DocumentNotificationEmailData): Promise<boolean> {
    const subject = `New Document${data.documents.length > 1 ? 's' : ''} Uploaded in ${data.documents[0]?.studyTitle || 'Your Study'}`;
    const react = <NewDocumentEmail {...data} />;

    return this.sendEmail({
      to: data.to,
      subject,
      react,
    });
  }

  async sendDocumentReviewRequest(data: DocumentReviewEmailData): Promise<boolean> {
    const subject = `Document${data.documents.length > 1 ? 's' : ''} Pending Your Review`;
    const react = <DocumentReviewEmail {...data} />;

    return this.sendEmail({
      to: data.to,
      subject,
      react,
    });
  }

  async sendDailyDigest(data: {
    to: string;
    userName: string;
    newDocuments: any[];
    updatedDocuments: any[];
    archivedDocuments: any[];
  }): Promise<boolean> {
    const total =
      data.newDocuments.length +
      data.updatedDocuments.length +
      data.archivedDocuments.length;

    if (total === 0) {
      return true; // не отправляем пустое письмо
    }

    const subject = `Daily Digest: ${total} update${total > 1 ? 's' : ''} in your studies`;

    const react = (
      <DigestEmail
        userName={data.userName}
        appUrl={process.env.APP_URL!}
        newDocuments={data.newDocuments}
        updatedDocuments={data.updatedDocuments}
        archivedDocuments={data.archivedDocuments}
      />
    );

    return this.sendEmail({
      to: data.to,
      subject,
      react,
    });
  }  
}
