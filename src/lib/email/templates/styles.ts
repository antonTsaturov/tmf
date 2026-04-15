// lib/email/templates/styles.ts
// Shared styles for all email templates

export const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
};

export const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  marginTop: '40px',
  marginBottom: '40px',
  borderRadius: '8px',
  overflow: 'hidden',
  maxWidth: '600px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

export const header = {
  backgroundColor: '#667eea',
  padding: '32px 40px',
  textAlign: 'center' as const,
};

export const logo = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0',
  letterSpacing: '1px',
};

export const content = {
  padding: '40px',
};

export const heading = {
  color: '#2d3748',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px 0',
};

export const paragraph = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

export const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

export const button = {
  backgroundColor: '#667eea',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

export const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
};

export const footer = {
  backgroundColor: '#f7fafc',
  padding: '24px 40px',
  borderTop: '1px solid #e2e8f0',
};

export const footerDivider = {
  borderColor: '#e2e8f0',
  margin: '0 0 12px 0',
};

export const footerText = {
  color: '#a0aec0',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '4px 0',
  textAlign: 'center' as const,
};

export const footerDisclaimer = {
  color: '#a0aec0',
  fontSize: '11px',
  lineHeight: '18px',
  margin: '8px 0 0 0',
  textAlign: 'center' as const,
};
