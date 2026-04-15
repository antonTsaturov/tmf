// lib/email/templates/digest-email.tsx

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

type DigestEmailProps = {
  userName: string;
  appUrl: string;
  newDocuments: any[];
  updatedDocuments: any[];
  archivedDocuments: any[];
};

export const DigestEmail = ({
  userName,
  appUrl,
  newDocuments,
  updatedDocuments,
  archivedDocuments,
}: DigestEmailProps) => {
  const total =
    newDocuments.length +
    updatedDocuments.length +
    archivedDocuments.length;

  const previewText = `You have ${total} update${
    total !== 1 ? 's' : ''
  } in ExploreTMF`;

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
            <Text style={heading}>Daily Activity Summary</Text>

            <Text style={paragraph}>
              Hello {userName},
            </Text>

            <Text style={paragraph}>
              Here is a summary of document activity in your studies over the last 24 hours:
            </Text>

            {/* Summary Box */}
            <Section style={summaryBox}>
              <Text style={summaryItem}>
                New documents: <strong>{newDocuments.length}</strong>
              </Text>
              <Text style={summaryItem}>
                Updated versions: <strong>{updatedDocuments.length}</strong>
              </Text>
              <Text style={summaryItem}>
                Archived: <strong>{archivedDocuments.length}</strong>
              </Text>
            </Section>

            {/* New Documents */}
            {newDocuments.length > 0 && (
              <>
                <Text style={sectionHeading}>New Documents</Text>
                {newDocuments.slice(0, 10).map((doc: any) => (
                  <Text key={doc.id} style={listItem}>
                    • {doc.document_name} ({doc.study_protocol})
                  </Text>
                ))}
              </>
            )}

            {/* Updated Documents */}
            {updatedDocuments.length > 0 && (
              <>
                <Text style={sectionHeading}>Updated Documents</Text>
                {updatedDocuments.slice(0, 10).map((doc: any) => (
                  <Text key={doc.id} style={listItem}>
                    • {doc.document_name} (v{doc.document_number})
                  </Text>
                ))}
              </>
            )}

            {/* Archived */}
            {archivedDocuments.length > 0 && (
              <>
                <Text style={sectionHeading}>Archived Documents</Text>
                {archivedDocuments.slice(0, 10).map((doc: any) => (
                  <Text key={doc.id} style={listItem}>
                    • {doc.folder_name}
                  </Text>
                ))}
              </>
            )}

            {/* Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={appUrl}>
                Open ExploreTMF
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              You are receiving this email because you are subscribed to daily notifications.
            </Text>
          </Section>

          {/* Footer */}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

// Template-specific styles
const summaryBox = {
  backgroundColor: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const summaryItem = {
  fontSize: '14px',
  margin: '6px 0',
  color: '#2d3748',
};

const sectionHeading = {
  fontSize: '16px',
  fontWeight: '600',
  margin: '20px 0 10px 0',
  color: '#2d3748',
};

const listItem = {
  fontSize: '14px',
  color: '#4a5568',
  margin: '4px 0',
};