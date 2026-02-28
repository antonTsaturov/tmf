import '../styles/DocumentStatusBadge.css'
import { Colors } from '@/types/types';


interface DocumentStatusBadgeProps {
  status: string;
}

const DocumentStatusBadge = ({status}: DocumentStatusBadgeProps) => {

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'DRAFT', color: Colors.GRAY },
    in_review: { label: 'IN REVIEW', color: Colors.BLUE },
    approved: { label: 'APPROVED', color: Colors.GREEN },
    archived: { label: 'ARCHIVED', color: Colors.YELLOW },
    deleted: { label: 'DELETED', color: Colors.RED },
  };
  
  const config = statusConfig[status];

  return (
    <span 
      className="document-status-badge"
      style={{ 
        backgroundColor: config.color + '20',
        color: config.color,
        borderColor: config.color + '40',
        fontWeight: 600
      }}
    >
      {config.label}
    </span>
  );
};

export default DocumentStatusBadge;