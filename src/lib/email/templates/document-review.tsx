// lib/email/templates/document-review.tsx
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
import { DocumentReviewEmailData } from '../types';
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

export const DocumentReviewEmail = ({
  recipientName,
  documents,
  reviewDeadline,
  comments,
}: DocumentReviewEmailData) => {
  const previewText = `Document${documents.length > 1 ? 's' : ''} pending your review`;
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
            <Text style={heading}>Document{documents.length > 1 ? 's' : ''} Pending Your Review</Text>
            
            <Text style={paragraph}>
              Hello {recipientName},
            </Text>
            <Text style={paragraph}>
              {documents.length > 1 
                ? `${documents.length} documents have been` 
                : `A document has been`} submitted for your review in <strong>{studyTitle}</strong>.
            </Text>

            {reviewDeadline && (
              <Section style={deadlineBox}>
                <Text style={deadlineText}>
                  <strong>Review Deadline:</strong> {reviewDeadline}
                </Text>
              </Section>
            )}

            {/* Document List */}
            <Section style={documentList}>
              {documents.map((doc, index) => (
                <Section key={index} style={documentItem}>
                  <Text style={documentName}>{doc.documentName}</Text>
                  {doc.documentType && (
                    <Text style={documentMeta}>Type: {doc.documentType}</Text>
                  )}
                  <Text style={documentMeta}>
                    Submitted by {doc.uploadedBy} • {doc.uploadedAt}
                  </Text>
                  {documents.length > 1 && index < documents.length - 1 && (
                    <Hr style={documentDivider} />
                  )}
                </Section>
              ))}
            </Section>

            {comments && (
              <Section style={commentsBox}>
                <Text style={commentsHeading}>Reviewer Comments:</Text>
                <Text style={commentsText}>{comments}</Text>
              </Section>
            )}

            <Section style={buttonContainer}>
              <Button style={button} href={documents[0]?.documentUrl || '#'}>
                Review Document{documents.length > 1 ? 's' : ''}
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={paragraph}>
              Please review the document{documents.length > 1 ? 's' : ''} and provide your feedback before the deadline.
            </Text>
          </Section>

          {/* Footer */}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
};

export default DocumentReviewEmail;

// Template-specific styles
const deadlineBox = {
  backgroundColor: '#ebf8ff',
  border: '1px solid #90cdf4',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const deadlineText = {
  color: '#2c5282',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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

const commentsBox = {
  backgroundColor: '#f0fff4',
  border: '1px solid #9ae6b4',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const commentsHeading = {
  color: '#22543d',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const commentsText = {
  color: '#276749',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};
