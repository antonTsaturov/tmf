// // components/DocumentActions.tsx
// import React, { useContext, useState, useEffect } from 'react';
// import { 
//   FiFilePlus, 
//   FiSend, 
//   FiXCircle, 
//   FiCheckCircle, 
//   FiX, 
//   FiRotateCcw, 
//   FiArchive, 
//   FiRefreshCw, 
//   FiTrash2, 
//   FiDownload, 
//   FiEye,
//   FiUploadCloud
// } from 'react-icons/fi';
// import { MainContext } from '@/wrappers/MainContext';
// import { DocumentAction, DocumentWorkFlowStatus, Transitions as transitions } from '@/types/document';
// import '../styles/DocumentActions.css';
// import { useDocumentDelete } from '@/hooks/useDocumentDelete';
// import { useAuth } from '@/wrappers/AuthProvider';
// import { ViewLevel } from './FileExplorer';
// //import { usePDFCache } from '@/hooks/usePDFCache';
// import { getAvailableDocumentActions } from '@/domain/document/document.logic';
// import { UserRole } from '@/types/types';

// interface DocumentActionsProps {
//   onAction?: (action: DocumentAction) => void;
//   className?: string;
//   onDocumentDeleted?: () => void; // Колбэк для обновления списка после удаления
//   onDocumentRestored?: () => void; // Колбэк для обновления списка после восстановления
// }

// // Маппинг действий на иконки и текст
// export const actionConfig: Record<DocumentAction, { icon: React.ReactNode; label: string; color?: string }> = {
//   [DocumentAction.CREATE_DOCUMENT]: { 
//     icon: <FiFilePlus />, 
//     label: 'Создать',
//     color: '#4CAF50'
//   },
//   [DocumentAction.SUBMIT_FOR_REVIEW]: { 
//     icon: <FiSend />, 
//     label: 'На ревью',
//     color: '#2196F3'
//   },
//   [DocumentAction.APPROVE]: { 
//     icon: <FiCheckCircle />, 
//     label: 'Утвердить',
//     color: '#4CAF50'
//   },
//   [DocumentAction.REJECT]: { 
//     icon: <FiX />, 
//     label: 'Отклонить',
//     color: '#F44336'
//   },
//   [DocumentAction.ARCHIVE]: { 
//     icon: <FiArchive />, 
//     label: 'Архивировать',
//     color: '#795548'
//   },
//   [DocumentAction.UNARCHIVE]: { 
//     icon: <FiRefreshCw />, 
//     label: 'Разархивировать',
//     color: '#795548'
//   },
//   [DocumentAction.SOFT_DELETE]: { 
//     icon: <FiTrash2 />, 
//     label: 'Удалить',
//     color: '#F44336'
//   },
//   [DocumentAction.RESTORE]: { 
//     icon: <FiRefreshCw />, 
//     label: 'Восстановить',
//     color: '#4CAF50'
//   },
//   [DocumentAction.UPLOAD_NEW_VERSION]: { 
//     icon: <FiUploadCloud />, 
//     label: 'Новая версия',
//     color: '#2196F3'
//   },
//   [DocumentAction.VIEW]: { 
//     icon: <FiEye />, 
//     label: 'Просмотр',
//     color: '#607D8B'
//   },
//   [DocumentAction.DOWNLOAD]: { 
//     icon: <FiDownload />, 
//     label: 'Скачать',
//     color: '#607D8B'
//   }
// };

// const DocumentActions: React.FC<DocumentActionsProps> = ({ 
//   onAction, 
//   className = '',
//   onDocumentDeleted,
//   onDocumentRestored,
// }) => {
//   const mainContext = useContext(MainContext);
//   if (!mainContext) throw new Error('DocumentActions must be used within MainContext Provider');
//   const { context, updateContext, setFilePreview, setNewVersionPreview } = mainContext;
//   const { selectedFolder, selectedDocument, currentStudy, currentSite, currentLevel} = context;

//   const { user } = useAuth();
//   //const { isUploading, progress } = useDocumentUpload();
//   const { deleteDocument, restoreDocument, isDeleting, isRestoring, error } = useDocumentDelete();
//   //const {getAllCachedPDFs} = usePDFCache();
  
//   const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
//   // Автоматически скрываем уведомление через 3 секунды
//   useEffect(() => {
//     if (notification) {
//       const timer = setTimeout(() => {
//         setNotification(null);
//       }, 3000);
//       return () => clearTimeout(timer);
//     }
//   }, [notification]);

//   // Отображаем ошибку из хука
//   useEffect(() => {
//     if (error) {
//       setNotification({ type: 'error', message: error });
//     }
//   }, [error]);

//   const availableActions = getAvailableDocumentActions(selectedDocument, user?.role as unknown as UserRole[]);
//   // Обработчик выбора файлов
//   const handleFileSelect = () => {
//     if (!selectedFolder) {
//       alert('Сначала выберите папку');
//       return;
//     }

//     if (!user?.id) {
//       alert('Пользователь не авторизован');
//       return;
//     }

//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.pdf,application/pdf,.txt,text/plain';
//     input.multiple = false; // Пока что загружаем по одному файлу
    
//     input.onchange = (e) => {
//       const target = e.target as HTMLInputElement;
//       const files = target.files;
      
//       if (!files || files.length === 0) return;
      
//       const file = files[0];
      
//       // Создаем превью и сохраняем в контекст
//       setFilePreview({
//         file,
//         customName: file.name.replace(/\.[^/.]+$/, ''), // Убираем расширение
//         size: file.size,
//         studyId: currentStudy?.id!,
//         siteId: currentSite?.id!,
//         folderId: selectedFolder.id,
//         folderName: selectedFolder.name,
//         createdBy: user.id
//       });
      
//       input.remove();
//     };
    
//     input.click();
//   };

//   const handleCreateDocument = () => {
//     handleFileSelect();
//   };


//   const handleUploadNewVersion = () => {
//     if (!selectedDocument) return;
//     if (!user?.id && !user?.email) {
//       alert('Пользователь не авторизован');
//       return;
//     }

//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.pdf,application/pdf,.txt,text/plain';
//     input.multiple = false;

//     input.onchange = (e) => {
//       const target = e.target as HTMLInputElement;
//       const files = target.files;
//       if (!files || files.length === 0) return;

//       const file = files[0];
//       const preview = { file, document: selectedDocument };
//       if (typeof setNewVersionPreview === 'function') {
//         setNewVersionPreview(preview);
//       } else {
//         updateContext({ newVersionPreview: preview, isNewVersionPanelOpen: true });
//       }
//       input.remove();
//     };

//     input.click();
//   };

//   const handleActionClick = async (action: DocumentAction) => {
//     if (action === DocumentAction.CREATE_DOCUMENT) {
//       handleCreateDocument();
//       return;
//     }

//     if (action === DocumentAction.UPLOAD_NEW_VERSION) {
//       handleUploadNewVersion();
//       return;
//     }

//     if (action === DocumentAction.SOFT_DELETE) {
//       updateContext({ isDeletePanelOpen: true });
//       return;
//     }

//     if (action === DocumentAction.VIEW) {
//       // PDFViewer сам отреагирует на selectedDocument
//       updateContext({ isRightFrameOpen: true});
//     }

//     if (action === DocumentAction.SUBMIT_FOR_REVIEW) {
//       updateContext({ isSubmittingToReview: true});
//       return;
//     }

//     if (action === DocumentAction.APPROVE || action === DocumentAction.REJECT) {
//       // Открываем модальное окно ревью
//       updateContext({ isAcceptedForReview: true });
//       return;
//     }

//     if (action === DocumentAction.ARCHIVE) {
//       updateContext({ isArchivePanelOpen: true});
//       return;
//     }


//     onAction?.(action);
//   };

//   if (availableActions.length === 0) {
//     return null;
//   }

//   return (
//     <>
//       {/* Уведомления */}
//       {notification && (
//         <div className={`doc-action-notification doc-action-notification--${notification.type}`}>
//           {notification.message}
//         </div>
//       )}

//       <div className={`doc-action-root ${className}`}>
//         <div className="doc-action-container">
//           {(() => {
//             // Определяем, нужно ли показывать кнопки
//             const shouldShowActions = 
//               (currentLevel === ViewLevel.GENERAL && selectedFolder) ||
//               (currentLevel === ViewLevel.SITE && currentSite && selectedFolder);
            
//             if (!shouldShowActions) return null;
            
//             return availableActions.map((action, i) => (
//               <button
//                 key={`${action}-${i}`}
//                 type="button"
//                 className={`doc-action-btn doc-action-btn--${action.replace(/_/g, '-')} ${(isDeleting || isRestoring) ? 'doc-action-btn--disabled' : ''}`}
//                 onClick={() => handleActionClick(action)}
//                 title={actionConfig[action].label}
//                 style={{ '--doc-action-color': actionConfig[action].color } as React.CSSProperties}
//                 disabled={isDeleting || isRestoring}
//               >
//                 <span className="doc-action-icon">{actionConfig[action].icon}</span>
//                 <span className="doc-action-label">{actionConfig[action].label}</span>
//               </button>
//             ));
//           })()}
//         </div>
//       </div>
//     </>
//   );
// };

// export default DocumentActions;

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
import { Flex, Button, Tooltip, Callout } from '@radix-ui/themes';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction, DocumentWorkFlowStatus, Transitions as transitions } from '@/types/document';
import { useDocumentDelete } from '@/hooks/useDocumentDelete';
import { useAuth } from '@/wrappers/AuthProvider';
import { ViewLevel } from './FileExplorer';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole, Colors } from '@/types/types';
import '@/styles/DocumentActions.css';
import { useResizeObserver } from '@/hooks/useResizeObserver';

interface DocumentActionsProps {
  onAction?: (action: DocumentAction) => void;
  className?: string;
  onDocumentDeleted?: () => void;
  onDocumentRestored?: () => void;
}

// Маппинг действий на иконки, текст и вариант кнопки
export const actionConfig: Record<DocumentAction, { 
  icon: React.ReactNode; 
  label: string; 
  color?: string;
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  highContrast?: boolean;
  }> = {
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
  [DocumentAction.REJECT]: { // Не используется. Реджект выполняется через Approve
    icon: <FiX />, 
    label: 'Отклонить',
    variant: 'solid',
    //color: Colors.RED
  },
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
  if (!mainContext) throw new Error('DocumentActions must be used within MainContext Provider');
  const { context, updateContext, setFilePreview, setNewVersionPreview } = mainContext;
  const { selectedFolder, selectedDocument, currentStudy, currentSite, currentLevel} = context;
  const containerRef = useRef<HTMLDivElement>(null)
  const { width } = useResizeObserver(containerRef);
  console.log(width)
  const { user } = useAuth();
  const { isDeleting, isRestoring, error } = useDocumentDelete();
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Автоматически скрываем уведомление через 3 секунды
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Отображаем ошибку из хука
  useEffect(() => {
    if (error) {
      setNotification({ type: 'error', message: error });
    }
  }, [error]);

  const availableActions = getAvailableDocumentActions(selectedDocument, user?.role as unknown as UserRole[]);

  // Обработчик выбора файлов
  const handleFileSelect = () => {
    if (!selectedFolder) {
      setNotification({ type: 'error', message: 'Сначала выберите папку' });
      return;
    }

    if (!user?.id) {
      setNotification({ type: 'error', message: 'Пользователь не авторизован' });
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
      setNotification({ type: 'error', message: 'Выберите документ' });
      return;
    }
    if (!user?.id && !user?.email) {
      setNotification({ type: 'error', message: 'Пользователь не авторизован' });
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
  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
    }
  }, []);

  //console.log(containerRef)
  return (
    <>
      {/* Уведомления с использованием Radix Callout */}
      {notification && (
        <Callout.Root 
          color={notification.type === 'success' ? 'green' : 'red'} 
          size="1"
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            zIndex: 1000,
            maxWidth: '300px'
          }}
        >
          <Callout.Text>{notification.message}</Callout.Text>
        </Callout.Root>
      )}

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