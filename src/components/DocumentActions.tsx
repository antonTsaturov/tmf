// components/DocumentActions.tsx
import React, { useContext } from 'react';
import {
  FiFilePlus,
  FiSend,
  FiCheckCircle,
  FiArchive,
  FiRefreshCw,
  FiTrash2,
  FiDownload,
  FiEye,
  FiUploadCloud,
  FiEdit
} from 'react-icons/fi';
import { Flex, Button, Tooltip } from '@radix-ui/themes';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction } from '@/types/document';
import { useAuth } from '@/wrappers/AuthProvider';
import { ViewLevel } from '@/types/types';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole } from '@/types/types';
import '@/styles/DocumentActions.css';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { useDocumentActionHandler } from '@/hooks/useDocumentActionHandler';

interface DocumentActionsProps {
  //onAction?: (action: DocumentAction) => void;
  className?: string;
  onDocumentDeleted?: () => void;
  onDocumentRestored?: () => void;
}

interface ActionConfigProps {
  icon: React.ReactNode; 
  label: string;
  tooltip?: string;
  color?: string;
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  highContrast?: boolean;
}

// Маппинг действий на иконки, текст и вариант кнопки
export const actionConfig: Partial<Record<DocumentAction, ActionConfigProps>> = {
  [DocumentAction.CREATE_DOCUMENT]: { 
    icon: <FiFilePlus />, 
    label: 'Создать',
    tooltip: 'Создать документ',
    variant: 'solid',
    highContrast: true
  },
  [DocumentAction.SUBMIT_FOR_REVIEW]: { 
    icon: <FiSend />, 
    label: 'На ревью',
    tooltip: 'Отправить документ на рассмотрение',
    variant: 'soft',
  },
  [DocumentAction.APPROVE]: { 
    icon: <FiCheckCircle />, 
    label: 'Проверить',
    tooltip: 'Одобрить или отклонить документ',
    variant: 'solid',
  },
  // [DocumentAction.REJECT]: { // Не используется. Реджект выполняется через Approve
  //   icon: <FiX />, 
  //   label: 'Отклонить',
  //   variant: 'solid',
  //   //color: Colors.RED
  // },
  [DocumentAction.ARCHIVE]: { 
    icon: <FiArchive />, 
    label: 'Архивировать',
    tooltip: 'Перенести документ в архив',
    variant: 'soft',
  },
  [DocumentAction.UNARCHIVE]: {  //Admin only
    icon: <FiRefreshCw />, 
    label: 'Разархивировать',
    tooltip: 'Венруть в статус draft',
    variant: 'soft'
  },
  [DocumentAction.SOFT_DELETE]: { 
    icon: <FiTrash2 />, 
    label: 'Удалить',
    tooltip: 'Удалить документ',
    variant: 'solid',
  },
  [DocumentAction.RESTORE]: { //Admin only
    icon: <FiRefreshCw />, 
    label: 'Восстановить',
    tooltip: 'Восстановить документ',
    variant: 'solid'
  },
  [DocumentAction.UPLOAD_NEW_VERSION]: { 
    icon: <FiUploadCloud />, 
    label: 'Новая версия',
    tooltip: 'Зазгрузить новую версию документа',
    variant: 'soft',
  },
  [DocumentAction.VIEW]: { 
    icon: <FiEye />, 
    label: 'Просмотр',
    tooltip: 'Подробная информация о документе',
    variant: 'soft'
  },
  [DocumentAction.DOWNLOAD]: { 
    icon: <FiDownload />, 
    label: 'Скачать',
    tooltip: 'Скачать документ',
    variant: 'soft'
  },
  [DocumentAction.EDIT]: { 
    icon: <FiEdit />, 
    label: 'Изменить',
    tooltip: 'Изменить название документа',
    variant: 'soft'
  }
};

const MIN_WIDTH = 700; // Width buttons container

const DocumentActions: React.FC<DocumentActionsProps> = ({ 
  className = '',
}) => {
  const { user } = useAuth();
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('DocumentActions must be used within MainContext Provider');
  const { context } = mainContext;
  const { selectedFolder, selectedDocument, currentSite, currentLevel, currentStudy} = context;
  
  // Хук для уменьшения кнопок при сужении контейнера
  const [containerRef, { width }] = useResizeObserver<HTMLDivElement>();
  
  const { handleAction } = useDocumentActionHandler();

  // Определяет какие кнопки показать 
  const availableActions = getAvailableDocumentActions(
    selectedDocument,
    user?.role as unknown as UserRole[],
    currentSite?.status,
    currentStudy?.status
  );

  // Определяет какое модальное окно нужно открыть (в зависимости от кнопки)
  const handleActionClick = async (action: DocumentAction) => {
    handleAction(action);
  };

  // Определяем, нужно ли показывать кнопки
  const shouldShowActions = (currentLevel === ViewLevel.GENERAL && selectedFolder)
  || (currentLevel === ViewLevel.SITE && currentSite && selectedFolder)
  || (currentLevel === ViewLevel.COUNTRY && selectedFolder);

  if (!shouldShowActions || availableActions.length === 0) {
    return null;
  }

  return (
    <>
      <Flex 
        className={`${className}`} 
        gap="2" 
        wrap="wrap"
        align="center"
        style={{ padding: '8px', width: '100%' }}
        ref={containerRef}
      >
        {availableActions.map((action, index) => {
          const config = actionConfig[action];
          if (!config) return;
          
          return (
            <Tooltip 
              key={`${action}-${index}`} 
              content={config.tooltip}
            >
              <Button
                size="2"
                variant={config.variant || 'soft'}
                color={action === DocumentAction.SOFT_DELETE || action === DocumentAction.REJECT ? 'red' : undefined}
                highContrast={config.highContrast}
                onClick={() => handleActionClick(action)}
                style={config.color && !['red', 'green', 'blue'].includes(config.color) ? 
                  { backgroundColor: config.color } : undefined}
              >
                {config.icon}
                {width >= MIN_WIDTH && config.label}
              </Button>
            </Tooltip>
          );
        })}
      </Flex>
    </>
  );
};

export default DocumentActions;