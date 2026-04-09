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
            <Text style={logo}>ExploreTMF</Text>
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
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} ExploreTMF System
            </Text>
            <Text style={footerText}>
              This is an automated notification. To manage your email preferences, contact your administrator.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default NewDocumentEmail;

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
