// lib/email/templates/password-changed.tsx
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
import { PasswordChangedEmailData } from '../types';
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

export const PasswordChangedEmail = ({
  email,
  loginUrl,
  userName,
  changeOccurredAt,
}: PasswordChangedEmailData) => {
  const previewText = `Your ExploreTMF password has been changed, ${userName}`;

  const formattedDate = changeOccurredAt
    ? new Date(changeOccurredAt).toLocaleString()
    : new Date().toLocaleString();

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
            <Text style={heading}>Password Changed</Text>
            <Text style={paragraph}>Hello {userName},</Text>
            <Text style={paragraph}>
              The password for your ExploreTMF account associated with <strong>{email}</strong> was successfully changed on <strong>{formattedDate}</strong>.
            </Text>

            <Section style={infoBox}>
              <Text style={infoHeading}>Didn't change your password?</Text>
              <Text style={paragraph}>
                If you did NOT make this change, please contact your system administrator immediately, as your account may be compromised.
              </Text>
            </Section>

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
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordChangedEmail;

// Template-specific styles
const infoBox = {
  backgroundColor: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const infoHeading = {
  color: '#2d3748',
  fontSize: '14px',
  fontWeight: '600',
  margin: '12px 0 0 0',
};