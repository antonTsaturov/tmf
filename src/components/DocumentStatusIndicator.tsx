// components/DocumentStatusIndicator.tsx
import React, { useContext } from 'react';
import { Flex, Tooltip, Box } from '@radix-ui/themes';
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { IoIosCheckmark } from "react-icons/io";
import { Colors } from '@/lib/constants';
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
  [DocumentWorkFlowStatus.DRAFT]: 'Черновик',
  [DocumentWorkFlowStatus.IN_REVIEW]: 'На ревью',
  [DocumentWorkFlowStatus.APPROVED]: 'Утвержден',
  [DocumentWorkFlowStatus.ARCHIVED]: 'Архивирован',
  [DocumentWorkFlowStatus.DELETED]: 'Удален',
};

const statusColors: Record<DocumentWorkFlowStatus, { active: string; inactive: string }> = {
  [DocumentWorkFlowStatus.DRAFT]: { active: Colors.GRAY, inactive: 'var(--gray-4)' },
  [DocumentWorkFlowStatus.IN_REVIEW]: { active: Colors.BLUE, inactive: 'var(--blue-3)' },
  [DocumentWorkFlowStatus.APPROVED]: { active: Colors.GREEN, inactive: 'var(--green-3)' },
  [DocumentWorkFlowStatus.ARCHIVED]: { active: Colors.YELLOW, inactive: 'var(--amber-3)' },
  [DocumentWorkFlowStatus.DELETED]: { active: Colors.RED, inactive: 'var(--red-3)' },
};

const DocumentStatusIndicator: React.FC<DocumentStatusIndicatorProps> = ({
  size = 'small',
}) => {
  const { context } = useContext(MainContext)!;
  const { selectedDocument, selectedFolder } = context;

  // Определяем статус документа
  const status = selectedDocument?.is_archived
    ? DocumentWorkFlowStatus.ARCHIVED
    : selectedDocument?.is_deleted
    ? DocumentWorkFlowStatus.DELETED
    : selectedDocument?.status || null;

  const currentIndex = status ? statusOrder.indexOf(status) : -1;
  const showEmpty = !selectedDocument;

  // Определяем размеры в зависимости от пропса size
  const getCircleSize = () => {
    switch (size) {
      case 'small': return '14px';
      case 'medium': return '18px';
      case 'big': return '20px';
      default: return '14px';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 18;
      case 'medium': return 22;
      case 'big': return 26;
      default: return 18;
    }
  };

  const circleSize = getCircleSize();
  const iconSize = getIconSize();

  return (
    <Flex align="center">
      {selectedFolder && statusOrder.map((s, index) => {
        const isActive = !showEmpty && index <= currentIndex;
        const isCurrent = !showEmpty && s === status;
        const colors = statusColors[s];
        
        const circle = (
          <Box
            key={s}
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: '50%',
              backgroundColor: isActive ? colors.active : colors.inactive,
              border: isCurrent ? '2px solid var(--gray-10)' : '2px solid transparent',
              opacity: showEmpty ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              cursor: showEmpty ? 'default' : 'help',
              flexShrink: 0,
              zIndex: 2,
            }}
          >
            {isActive && (
              <IoIosCheckmark 
                size={iconSize} 
                color="white" 
                style={{ 
                  display: 'block',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                }} 
              />
            )}
          </Box>
        );

        // Добавляем Tooltip только если есть выбранный документ
        return (
          <React.Fragment key={s}>
            {/* Круг */}
            {showEmpty ? circle : <Tooltip content={statusLabels[s]}>{circle}</Tooltip>}
            
            {/* Горизонтальная линия между кругами (кроме последнего) */}
            {index < statusOrder.length - 1 && (
              <Box
                style={{
                  width: size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
                  height: '1px',
                  backgroundColor: !showEmpty && index < currentIndex 
                    ? colors.active 
                    : !showEmpty && index === currentIndex - 1 
                    ? colors.active 
                    : 'var(--gray-5)',
                  transition: 'background-color 0.2s ease',
                  margin: '0 4px',
                  flexShrink: 1,
                  minWidth: size === 'small' ? '8px' : size === 'medium' ? '12px' : '16px',
                  maxWidth: size === 'small' ? '20px' : size === 'medium' ? '24px' : '28px'
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </Flex>
  );
};

export default DocumentStatusIndicator;