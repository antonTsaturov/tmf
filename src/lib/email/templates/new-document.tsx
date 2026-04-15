// lib/email/templates/new-document.tsx
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
import { DocumentNotificationEmailData } from '../types';
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

export const NewDocumentEmail = ({
  recipientName,
  documents,
}: DocumentNotificationEmailData) => {
  const previewText = `New document${documents.length > 1 ? 's' : ''} uploaded to ${documents[0]?.studyTitle || 'your study'}`;
  const studyTitle = documents[0]?.studyTitle || 'Clinical Study';

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
            <Text style={heading}>New Document{documents.length > 1 ? 's' : ''} Uploaded</Text>
            
            <Text style={paragraph}>
              Hello {recipientName},
            </Text>
            <Text style={paragraph}>
              {documents.length > 1 
                ? `${documents.length} new documents have been` 
                : `A new document has been`} uploaded to <strong>{studyTitle}</strong>.
            </Text>

            {/* Document List */}
            <Section style={documentList}>
              {documents.map((doc, index) => (
                <Section key={index} style={documentItem}>
                  <Text style={documentName}>{doc.documentName}</Text>
                  {doc.documentType && (
                    <Text style={documentMeta}>Type: {doc.documentType}</Text>
                  )}
                  <Text style={documentMeta}>
                    Uploaded by {doc.uploadedBy} • {doc.uploadedAt}
                  </Text>
                  {documents.length > 1 && index < documents.length - 1 && (
                    <Hr style={documentDivider} />
                  )}
                </Section>
              ))}
            </Section>

            {documents[0]?.documentUrl && (
              <Section style={buttonContainer}>
                <Button style={button} href={documents[0].documentUrl}>
                  View Document{documents.length > 1 ? 's' : ''}
                </Button>
              </Section>
            )}

            <Hr style={divider} />

            <Text style={paragraph}>
              You can view all documents for this study in the ExploreTMF system.
            </Text>
          </Section>

          {/* Footer */}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

export default NewDocumentEmail;

// Template-specific styles
const documentList = {
  backgroundColor: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const documentItem = {
  padding: '12px 0',
};

const documentName = {
  color: '#2d3748',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const documentMeta = {
  color: '#718096',
  fontSize: '14px',
  margin: '4px 0',
};

const documentDivider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
};
