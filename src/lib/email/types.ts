// lib/email/types.ts

export interface WelcomeEmailData {
  email: string;
  loginUrl: string;
  temporaryPassword?: string;
  userName: string;
}

export interface ResetPasswordEmailData {
  to: string;
  resetUrl: string;
  expiryMinutes: number;
  userName?: string;
}

export interface DocumentInfo {
  documentName: string;
  documentType?: string;
  studyTitle: string;
  uploadedBy: string;
  uploadedAt: string;
  documentUrl?: string;
}

export interface DocumentNotificationEmailData {
  to: string;
  recipientName: string;
  documents: DocumentInfo[];
}

export interface DocumentReviewEmailData {
  to: string;
  recipientName: string;
  documents: DocumentInfo[];
  reviewDeadline?: string;
  comments?: string;
}

export type EmailTemplateType =
  | 'welcome'
  | 'reset-password'
  | 'new-document'
  | 'document-review';

export interface EmailSendOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}
