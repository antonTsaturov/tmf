// lib/email/templates/reset-password.tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';
import { ResetPasswordEmailData } from '../types';

export const ResetPasswordEmail = ({
  resetUrl,
  expiryMinutes,
  userName,
}: ResetPasswordEmailData) => {
  const previewText = 'Reset your ExploreTMF password';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>ExploreTMF</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Text style={heading}>Reset Your Password</Text>
            
            {userName && (
              <Text style={paragraph}>
                Hello {userName},
              </Text>
            )}
            
            <Text style={paragraph}>
              We received a request to reset your password for your ExploreTMF account. Click the button below to create a new password.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Section style={infoBox}>
              <Text style={infoText}>
                ⏱️ This link will expire in <strong>{expiryMinutes} minutes</strong> for security purposes.
              </Text>
              <Text style={infoText}>
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </Text>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              If the button doesn't work, copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>
              {resetUrl}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} ExploreTMF System
            </Text>
            <Text style={footerText}>
              This is an automated message. Please do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

// Styles
const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  marginTop: '40px',
  marginBottom: '40px',
  borderRadius: '8px',
  overflow: 'hidden',
  maxWidth: '600px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const header = {
  backgroundColor: '#667eea',
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const logo = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0',
  letterSpacing: '1px',
};

const content = {
  padding: '40px',
};

const heading = {
  color: '#2d3748',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px 0',
};

const paragraph = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
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

const infoBox = {
  backgroundColor: '#fffaf0',
  border: '1px solid #fbd38d',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const infoText = {
  color: '#744210',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
};

const linkText = {
  color: '#667eea',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '8px 0',
};

const footer = {
  backgroundColor: '#f7fafc',
  padding: '24px 40px',
  borderTop: '1px solid #e2e8f0',
};

const footerText = {
  color: '#a0aec0',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '4px 0',
  textAlign: 'center' as const,
};
