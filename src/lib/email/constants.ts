// lib/email/constants.ts

// Base URL for email templates (images must use absolute URLs)
export const EMAIL_BASE_URL = process.env.APP_URL || 'http://localhost:3000';

// Logo URL used in all email templates
export const EMAIL_LOGO_URL = `${EMAIL_BASE_URL}/logo.png`;
