// components/DocumentActions.tsx
import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
  FiFilePlus, 
  FiSend, 
  FiXCircle, 
  FiCheckCircle, 
  FiX, 
  FiRotateCcw, 
  FiArchive, 
  FiRefreshCw, 
  FiTrash2, 
  FiDownload, 
  FiEye,
  FiUploadCloud
} from 'react-icons/fi';
import { Flex, Button, Tooltip } from '@radix-ui/themes';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction } from '@/types/document';
import { useDocumentDelete } from '@/hooks/useDocumentDelete';
import { useAuth } from '@/wrappers/AuthProvider';
import { ViewLevel } from '@/types/types';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole, Colors } from '@/types/types';
import { Document } from '@/types/document';
import '@/styles/DocumentActions.css';
import { useResizeObserver } from '@/hooks/useResizeObserver';
import { useNotification } from '@/wrappers/NotificationContext';

interface DocumentActionsProps {
  onAction?: (action: DocumentAction) => void;
  className?: string;
  onDocumentDeleted?: () => void;
  onDocumentRestored?: () => void;
}

// Маппинг действий на иконки, текст и вариант кнопки
export const actionConfig: Partial<Record<DocumentAction, { 
  icon: React.ReactNode; 
  label: string; 
  color?: string;
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  highContrast?: boolean;
}>> = {
  [DocumentAction.CREATE_DOCUMENT]: { 
    icon: <FiFilePlus />, 
    label: 'Создать',
    variant: 'solid',
    highContrast: true
  },
  [DocumentAction.SUBMIT_FOR_REVIEW]: { 
    icon: <FiSend />, 
    label: 'На ревью',
    variant: 'soft',
    //color: Colors.GREEN
  },
  [DocumentAction.APPROVE]: { 
    icon: <FiCheckCircle />, 
    label: 'Утвердить',
    variant: 'solid',
    //color: Colors.GREEN
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
    variant: 'soft',
    //color: Colors.YELLOW
  },
  [DocumentAction.UNARCHIVE]: { 
    icon: <FiRefreshCw />, 
    label: 'Разархивировать',
    variant: 'soft'
  },
  [DocumentAction.SOFT_DELETE]: { 
    icon: <FiTrash2 />, 
    label: 'Удалить',
    variant: 'solid',
    //color: Colors.RED
  },
  [DocumentAction.RESTORE]: { // Не используйется
    icon: <FiRefreshCw />, 
    label: 'Восстановить',
    variant: 'solid'
  },
  [DocumentAction.UPLOAD_NEW_VERSION]: { 
    icon: <FiUploadCloud />, 
    label: 'Новая версия',
    variant: 'soft',
    //color: Colors.BLUE
  },
  [DocumentAction.VIEW]: { 
    icon: <FiEye />, 
    label: 'Просмотр',
    variant: 'soft'
  },
  [DocumentAction.DOWNLOAD]: { 
    icon: <FiDownload />, 
    label: 'Скачать',
    variant: 'soft'
  }
};

const MIN_WIDTH = 700;

const DocumentActions: React.FC<DocumentActionsProps> = ({ 
  onAction, 
  className = '',
  onDocumentDeleted,
  onDocumentRestored,
}) => {
  const mainContext = useContext(MainContext);
  const { addNotification } = useNotification();
  if (!mainContext) throw new Error('DocumentActions must be used within MainContext Provider');
  const { context, updateContext, setFilePreview, setNewVersionPreview } = mainContext;
  const { selectedFolder, selectedDocument, currentStudy, currentSite, currentLevel} = context;
  const [containerRef, { width }] = useResizeObserver<HTMLDivElement>();
  const { user } = useAuth();
  const { isDeleting, isRestoring, error } = useDocumentDelete();

  const prevSelectedDocumentRef = useRef<Document | null>(null);


  useEffect(() => {
    if (selectedDocument !== prevSelectedDocumentRef.current) {
      console.log('Selected document changed:', selectedDocument?.id);
      prevSelectedDocumentRef.current = selectedDocument;
      // Можно добавить принудительное обновление, если нужно
    }
  }, [selectedDocument]);  

// Обработка ошибок удаления через глобальные уведомления
  useEffect(() => {
    if (error) {
      addNotification('error', error);
    }
  }, [error, addNotification]);

  const availableActions = getAvailableDocumentActions(selectedDocument, user?.role as unknown as UserRole[]);

  // Обработчик выбора файлов
  const handleFileSelect = () => {
    if (!selectedFolder) {
      addNotification( 'error', 'Сначала выберите папку' );
      return;
    }

    if (!user?.id) {
      addNotification('error', 'Пользователь не авторизован');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf,.txt,text/plain';
    input.multiple = false;
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      
      if (!files || files.length === 0) return;
      
      const file = files[0];
      
      setFilePreview({
        file,
        customName: file.name.replace(/\.[^/.]+$/, ''),
        size: file.size,
        studyId: currentStudy?.id!,
        siteId: currentSite?.id!,
        folderId: selectedFolder.id,
        folderName: selectedFolder.name,
        createdBy: user.id
      });
      
      input.remove();
    };
    
    input.click();
  };

  const handleCreateDocument = () => {
    handleFileSelect();
  };

  const handleUploadNewVersion = () => {
    if (!selectedDocument) {
      addNotification('error', 'Выберите документ');
      return;
    }
    if (!user?.id && !user?.email) {
      addNotification('error', 'Пользователь не авторизован');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf,.txt,text/plain';
    input.multiple = false;

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const preview = { file, document: selectedDocument };
      if (typeof setNewVersionPreview === 'function') {
        setNewVersionPreview(preview);
      } else {
        updateContext({ newVersionPreview: preview, isNewVersionPanelOpen: true });
      }
      input.remove();
    };

    input.click();
  };

  const handleActionClick = async (action: DocumentAction) => {
    if (action === DocumentAction.CREATE_DOCUMENT) {
      handleCreateDocument();
      return;
    }

    if (action === DocumentAction.UPLOAD_NEW_VERSION) {
      handleUploadNewVersion();
      return;
    }

    if (action === DocumentAction.SOFT_DELETE) {
      updateContext({ isDeletePanelOpen: true });
      return;
    }

    if (action === DocumentAction.VIEW) {
      updateContext({ isRightFrameOpen: true });
      return;
    }

    if (action === DocumentAction.SUBMIT_FOR_REVIEW) {
      updateContext({ isSubmittingToReview: true });
      return;
    }

    if (action === DocumentAction.APPROVE || action === DocumentAction.REJECT) {
      updateContext({ isAcceptedForReview: true });
      return;
    }

    if (action === DocumentAction.ARCHIVE) {
      updateContext({ isArchivePanelOpen: true });
      return;
    }

    onAction?.(action);
  };

  // Определяем, нужно ли показывать кнопки
  const shouldShowActions = 
    (currentLevel === ViewLevel.GENERAL && selectedFolder) ||
    (currentLevel === ViewLevel.SITE && currentSite && selectedFolder);

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
          const isDisabled = isDeleting || isRestoring;
          
          return (
            <Tooltip 
              key={`${action}-${index}`} 
              content={config.label}
            >
              <Button
                size="2"
                variant={config.variant || 'soft'}
                color={action === DocumentAction.SOFT_DELETE || action === DocumentAction.REJECT ? 'red' : undefined}
                highContrast={config.highContrast}
                onClick={() => handleActionClick(action)}
                disabled={isDisabled}
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