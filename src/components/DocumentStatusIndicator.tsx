// components/DocumentStatusIndicator.tsx
import React from 'react';
import { DocumentStatus } from '@/types/document';
import '../styles/DocumentStatusIndicator.css';
import { IoIosCheckmark } from "react-icons/io";

interface DocumentStatusIndicatorProps {
  status: DocumentStatus;
  size?: 'small' | 'medium' | 'big';
  showLabel?: boolean;
  className?: string;
}

const statusOrder: DocumentStatus[] = [
  DocumentStatus.DRAFT,
  DocumentStatus.IN_REVIEW,
  DocumentStatus.APPROVED,
  DocumentStatus.ARCHIVED,
  DocumentStatus.DELETED
];

const statusLabels: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]: 'Draft',
  [DocumentStatus.IN_REVIEW]: 'In review',
  [DocumentStatus.APPROVED]: 'Approved',
  [DocumentStatus.ARCHIVED]: 'Archived',
  [DocumentStatus.DELETED]: 'Deleted'
};

const statusColors: Record<DocumentStatus, { active: string; inactive: string }> = {
  [DocumentStatus.DRAFT]: { active: '#2196F3', inactive: '#9ed5fd' }, // синий
  [DocumentStatus.IN_REVIEW]: { active: '#FF9800', inactive: '#ffd693' }, // оранжевый
  [DocumentStatus.APPROVED]: { active: '#4CAF50', inactive: '#adffb4' }, // зеленый
  [DocumentStatus.ARCHIVED]: { active: '#9E9E9E', inactive: '#aeaeae' }, // серый
  [DocumentStatus.DELETED]: { active: '#F44336', inactive: '#ffa8b5' } // красный
};

const DocumentStatusIndicator: React.FC<DocumentStatusIndicatorProps> = ({
  status,
  size = 'small',
  showLabel = false,
  className = ''
}) => {
  const currentIndex = statusOrder.indexOf(status);
  
  const getCircleSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'medium': return 14;
      case 'big': return 16;
      default: return 12;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 20;
      case 'big': return 16;
      default: return 16;
    }
  };

  const circleSize = getCircleSize();
  const iconSize = getIconSize();

  return (
    <div className={`status-indicator ${className}`}>
      <div className="status-circles">
        {statusOrder.map((s, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = s === status;
          const color = isActive 
            ? statusColors[s].active 
            : statusColors[s].inactive;

          return (
            <div
              key={s}
              className={`status-circle ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
              style={{
                width: circleSize,
                height: circleSize,
                backgroundColor: color,
                borderColor: isCurrent ? '#333' : 'transparent'
              }}
              title={statusLabels[s]}
            >
              {isActive && (
                <IoIosCheckmark 
                  size={iconSize} 
                  color="white" 
                  style={{ 
                    display: 'block',
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))'
                  }} 
                />
              )}
            </div>
          );
        })}
      </div>
      
      {showLabel && (
        <span className="status-label">
          {statusLabels[status]}
        </span>
      )}
    </div>
  );
};

export default DocumentStatusIndicator;