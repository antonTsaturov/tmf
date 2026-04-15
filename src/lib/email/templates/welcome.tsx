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
} from '@react-email/components';
import { WelcomeEmailData } from '../types';
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
                  Please change your password after first login for security purposes.
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
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

// Template-specific styles
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
