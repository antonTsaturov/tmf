// lib/email/templates/welcome.tsx
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
  Link,
} from '@react-email/components';
import { WelcomeEmailData } from '../types';

export const WelcomeEmail = ({
  email,
  loginUrl,
  temporaryPassword,
  userName,
}: WelcomeEmailData) => {
  const previewText = `Welcome to ExploreTMF, ${userName}!`;

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
            <Text style={heading}>Welcome to ExploreTMF!</Text>
            <Text style={paragraph}>
              Hello {userName},
            </Text>
            <Text style={paragraph}>
              Your account has been created successfully. You can now access the ExploreTMF system to manage your clinical trial documents.
            </Text>

            {temporaryPassword && (
              <Section style={credentialsBox}>
                <Text style={credentialsHeading}>Your Login Credentials</Text>
                <Text style={credentialItem}>
                  <strong>Email:</strong> {email}
                </Text>
                <Text style={credentialItem}>
                  <strong>Temporary Password:</strong> {temporaryPassword}
                </Text>
                <Text style={warningText}>
                  ⚠️ Please change your password after first login for security purposes.
                </Text>
              </Section>
            )}

            <Section style={buttonContainer}>
              <Button style={button} href={loginUrl}>
                Sign In to ExploreTMF
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              If you have any questions or need assistance, please contact your system administrator.
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

export default WelcomeEmail;

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

const credentialsBox = {
  backgroundColor: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const credentialsHeading = {
  color: '#2d3748',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const credentialItem = {
  color: '#4a5568',
  fontSize: '14px',
  margin: '8px 0',
};

const warningText = {
  color: '#d69e2e',
  fontSize: '12px',
  fontWeight: '500',
  margin: '12px 0 0 0',
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

const divider = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
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
