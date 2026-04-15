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
import {
  main,
  container,
  header,
  logo,
  content,
  heading,
  paragraph,
  buttonContainer,
  button,
  divider,
} from './styles';
import EmailFooter from './EmailFooter';

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
            <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
              <tr>
                <td align="center" style={{ verticalAlign: 'middle' }}>
                  <span style={logo}>ExploreTMF</span>
                </td>
              </tr>
            </table>
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
                This link will expire in <strong>{expiryMinutes} minutes</strong> for security purposes.
              </Text>
              <Text style={infoText}>
                If you didn&apos;t request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </Text>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              If the button doesn&apos;t work, copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>
              {resetUrl}
            </Text>
          </Section>

          {/* Footer */}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

// Template-specific styles
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

const linkText = {
  color: '#667eea',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '8px 0',
};
