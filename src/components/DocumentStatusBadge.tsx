import '../styles/DocumentStatusBadge.css'
import { DocumentStatusConfig as statusConfig } from '@/types/document.status';


interface DocumentStatusBadgeProps {
  status?: string | undefined;
}

const DocumentStatusBadge = ({status}: DocumentStatusBadgeProps) => {
  
  const config = typeof status === 'undefined' ? statusConfig['draft'] :  statusConfig[status];

  return (
    <span 
      className="document-status-badge"
      style={{ 
        backgroundColor: config.color + '20',
        color: config.color,
        borderColor: config.color + '40',
        fontWeight: 600,
        borderBottom: '2px solid ' + config.color + '40'
      }}
    >
      {config.label}
    </span>
  );
};

export default DocumentStatusBadge;