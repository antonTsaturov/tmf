// components/DocumentStatusIndicator.tsx
import React, { useContext } from 'react';
import { DocumentWorkFlowStatus, DocumentLifeCycleStatus } from '@/types/document';
import '../styles/DocumentStatusIndicator.css';
import { IoIosCheckmark } from "react-icons/io";
import { Colors } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';

interface DocumentStatusIndicatorProps {
  size?: 'small' | 'medium' | 'big';
}

const statusOrder: DocumentWorkFlowStatus[] = [
  DocumentWorkFlowStatus.DRAFT,
  DocumentWorkFlowStatus.IN_REVIEW,
  DocumentWorkFlowStatus.APPROVED,
  DocumentWorkFlowStatus.ARCHIVED,
];

const statusLabels: Record<DocumentWorkFlowStatus, string> = {
  [DocumentWorkFlowStatus.DRAFT]: 'Draft',
  [DocumentWorkFlowStatus.IN_REVIEW]: 'In review',
  [DocumentWorkFlowStatus.APPROVED]: 'Approved',
  [DocumentWorkFlowStatus.ARCHIVED]: 'Archived',
  [DocumentWorkFlowStatus.DELETED]: 'Deleted',
};

const statusColors: Record<DocumentWorkFlowStatus, { active: string; inactive: string }> = {
  [DocumentWorkFlowStatus.DRAFT]: { active: Colors.GRAY, inactive: '#E0E0E0' },
  [DocumentWorkFlowStatus.IN_REVIEW]: { active: Colors.BLUE, inactive: '#E3F2FD' },
  [DocumentWorkFlowStatus.APPROVED]: { active: Colors.GREEN, inactive: '#E8F5E9' },
  [DocumentWorkFlowStatus.ARCHIVED]: { active: Colors.YELLOW, inactive: '#FFF8E1' },
  [DocumentWorkFlowStatus.DELETED]: { active: Colors.RED, inactive: '#FFEBEE' },
};

const DocumentStatusIndicator: React.FC<DocumentStatusIndicatorProps> = ({
  size = 'small',
}) => {
  const { context } = useContext(MainContext)!;
  const { selectedDocument } = context;

  // Определяем статус документа
  const status = selectedDocument?.is_archived
    ? DocumentWorkFlowStatus.ARCHIVED
    : selectedDocument?.is_deleted
    ? DocumentWorkFlowStatus.DELETED
    : selectedDocument?.status || null;

  const currentIndex = status ? statusOrder.indexOf(status) : -1;
  const showEmpty = !selectedDocument;

  const circleSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;
  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 16;

  return (
    <div className={`status-indicator`}>
      <div className="status-circles">
        {statusOrder.map((s, index) => {
          const isActive = !showEmpty && index <= currentIndex;
          const isCurrent = !showEmpty && s === status;
          const colors = statusColors[s];
          
          return (
            <div
              key={s}
              className={`status-circle ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
              style={{
                width: circleSize,
                height: circleSize,
                backgroundColor: isActive ? colors.active : colors.inactive,
                borderColor: isCurrent ? '#333' : 'transparent',
                opacity: showEmpty ? 0.5 : 1
              }}
              title={showEmpty ? '' : statusLabels[s]}
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
    </div>
  );
};

export default DocumentStatusIndicator;