// // components/DocumentStatusIndicator.tsx
// import React from 'react';
// import { DocumentWorkFlowStatus } from '@/types/document';
// import '../styles/DocumentStatusIndicator.css';
// import { IoIosCheckmark } from "react-icons/io";

// interface DocumentStatusIndicatorProps {
//   status: DocumentWorkFlowStatus;
//   size?: 'small' | 'medium' | 'big';
//   // showLabel?: boolean;
//   className?: string;
// }

// const statusOrder: DocumentWorkFlowStatus[] = [
//   DocumentWorkFlowStatus.DRAFT,
//   DocumentWorkFlowStatus.IN_REVIEW,
//   DocumentWorkFlowStatus.APPROVED,
//   DocumentWorkFlowStatus.ARCHIVED,
// ];

// const statusLabels: Partial<Record<DocumentWorkFlowStatus, string>> = {
//   [DocumentWorkFlowStatus.DRAFT]: 'Draft',
//   [DocumentWorkFlowStatus.IN_REVIEW]: 'In review',
//   [DocumentWorkFlowStatus.APPROVED]: 'Approved',
//   [DocumentWorkFlowStatus.ARCHIVED]: 'Archived',
// };

// export const statusColors: Partial<Record<DocumentWorkFlowStatus, { active: string; inactive: string }>> = {
//   [DocumentWorkFlowStatus.DRAFT]: { active: '#9E9E9E', inactive: '#aeaeae' }, // серый
//   [DocumentWorkFlowStatus.IN_REVIEW]: { active: '#2196F3', inactive: '#9ed5fd' }, // синий
//   [DocumentWorkFlowStatus.APPROVED]: { active: '#4CAF50', inactive: '#adffb4' }, // зеленый
//   [DocumentWorkFlowStatus.ARCHIVED]: { active: '#ffc107', inactive: '#ffd693' }, // оранжевый
// };

// const DocumentStatusIndicator: React.FC<DocumentStatusIndicatorProps> = ({
//   status,
//   size = 'small',
//   // showLabel = false,
//   className = ''
// }) => {
//   const currentIndex = statusOrder.indexOf(status);
  
//   const getCircleSize = () => {
//     switch (size) {
//       case 'small': return 12;
//       case 'medium': return 14;
//       case 'big': return 16;
//       default: return 12;
//     }
//   };

//   const getIconSize = () => {
//     switch (size) {
//       case 'small': return 16;
//       case 'medium': return 20;
//       case 'big': return 16;
//       default: return 16;
//     }
//   };

//   const circleSize = getCircleSize();
//   const iconSize = getIconSize();

//   return (
//     <div className={`status-indicator ${className}`}>
//       <div className="status-circles">
//         {statusOrder.map((s, index) => {
//           const isActive = index <= currentIndex;
//           const isCurrent = s === status;
//           const colorConfig = statusColors[s];
//           if (!colorConfig) {
//             // Возвращаем дефолтный цвет или null
//             return null; // или дефолтный компонент
//           }
//           const color = isActive ? colorConfig.active : colorConfig.inactive;

//           return (
//             <div
//               key={s}
//               className={`status-circle ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
//               style={{
//                 width: circleSize,
//                 height: circleSize,
//                 backgroundColor: color,
//                 borderColor: isCurrent ? '#333' : 'transparent'
//               }}
//               title={statusLabels[s]}
//             >
//               {isActive && (
//                 <IoIosCheckmark 
//                   size={iconSize} 
//                   color="white" 
//                   style={{ 
//                     display: 'block',
//                     filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))'
//                   }} 
//                 />
//               )}
//             </div>
//           );
//         })}
//       </div>
      
//       {/* {showLabel && (
//         <span className="status-label">
//           {statusLabels[status]}
//         </span>
//       )} */}
//     </div>
//   );
// };

// export default DocumentStatusIndicator;

// components/DocumentStatusIndicator.tsx
import React from 'react';
import { DocumentWorkFlowStatus } from '@/types/document';
import '../styles/DocumentStatusIndicator.css';
import { IoIosCheckmark } from "react-icons/io";

interface DocumentStatusIndicatorProps {
  status?: DocumentWorkFlowStatus | null; // Статус может быть не передан
  size?: 'small' | 'medium' | 'big';
  className?: string;
  showEmpty?: boolean; // Флаг для принудительного отображения пустых кружков
}

const statusOrder: DocumentWorkFlowStatus[] = [
  DocumentWorkFlowStatus.DRAFT,
  DocumentWorkFlowStatus.IN_REVIEW,
  DocumentWorkFlowStatus.APPROVED,
  DocumentWorkFlowStatus.ARCHIVED,
];

const statusLabels: Partial<Record<DocumentWorkFlowStatus, string>> = {
  [DocumentWorkFlowStatus.DRAFT]: 'Draft',
  [DocumentWorkFlowStatus.IN_REVIEW]: 'In review',
  [DocumentWorkFlowStatus.APPROVED]: 'Approved',
  [DocumentWorkFlowStatus.ARCHIVED]: 'Archived',
};

export const statusColors: Partial<Record<DocumentWorkFlowStatus, { active: string; inactive: string }>> = {
  [DocumentWorkFlowStatus.DRAFT]: { active: '#9E9E9E', inactive: '#E0E0E0' }, // серый активный, светло-серый неактивный
  [DocumentWorkFlowStatus.IN_REVIEW]: { active: '#2196F3', inactive: '#E3F2FD' }, // синий активный, светло-синий неактивный
  [DocumentWorkFlowStatus.APPROVED]: { active: '#4CAF50', inactive: '#E8F5E9' }, // зеленый активный, светло-зеленый неактивный
  [DocumentWorkFlowStatus.ARCHIVED]: { active: '#FFC107', inactive: '#FFF8E1' }, // желтый активный, светло-желтый неактивный
};

// Цвета для пустого состояния (все неактивные)
const emptyColors: Partial<Record<DocumentWorkFlowStatus, string>> = {
  [DocumentWorkFlowStatus.DRAFT]: '#E0E0E0',
  [DocumentWorkFlowStatus.IN_REVIEW]: '#E3F2FD',
  [DocumentWorkFlowStatus.APPROVED]: '#E8F5E9',
  [DocumentWorkFlowStatus.ARCHIVED]: '#FFF8E1',
};

const DocumentStatusIndicator: React.FC<DocumentStatusIndicatorProps> = ({
  status,
  size = 'small',
  className = '',
  showEmpty = false
}) => {
  // Определяем, показывать ли пустые кружки
  const showEmptyCircles = showEmpty || !status;
  
  // Если статус не передан или showEmpty=true, показываем все кружки неактивными
  const currentIndex = status ? statusOrder.indexOf(status) : -1;
  
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

  // Функция для получения цвета кружка
  const getCircleColor = (s: DocumentWorkFlowStatus, index: number) => {
    if (showEmptyCircles) {
      // Для пустого состояния - все кружки неактивные
      return emptyColors[s];
    }
    
    const isActive = index <= currentIndex;
    const colorConfig = statusColors[s];
    if (!colorConfig) return '#E0E0E0';
    
    return isActive ? colorConfig.active : colorConfig.inactive;
  };

  return (
    <div className={`status-indicator ${className}`}>
      <div className="status-circles">
        {statusOrder.map((s, index) => {
          const isActive = !showEmptyCircles && index <= currentIndex;
          const isCurrent = !showEmptyCircles && s === status;
          const color = getCircleColor(s, index);

          return (
            <div
              key={s}
              className={`status-circle ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''} ${showEmptyCircles ? 'empty' : ''}`}
              style={{
                width: circleSize,
                height: circleSize,
                backgroundColor: color,
                borderColor: isCurrent ? '#333' : 'transparent',
                opacity: showEmptyCircles ? 0.6 : 1
              }}
              title={!showEmptyCircles ? statusLabels[s] : ''}
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