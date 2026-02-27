// components/DocumentActions.tsx
import React, { useContext, useState, useEffect } from 'react';
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
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction, DocumentWorkFlowStatus, Transitions as transitions } from '@/types/document';
import '../styles/DocumentActions.css';
import { useDocumentDelete } from '@/hooks/useDocumentDelete';
import { useAuth } from '@/wrappers/AuthProvider';
import { ViewLevel } from './FileExplorer';
//import { usePDFCache } from '@/hooks/usePDFCache';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { getAvailableDocumentActions } from '@/domain/document/document.logic';
import { UserRole } from '@/types/types';

interface DocumentActionsProps {
  onAction?: (action: DocumentAction) => void;
  className?: string;
  onDocumentDeleted?: () => void; // Колбэк для обновления списка после удаления
  onDocumentRestored?: () => void; // Колбэк для обновления списка после восстановления
}

// Маппинг действий на иконки и текст
export const actionConfig: Record<DocumentAction, { icon: React.ReactNode; label: string; color?: string }> = {
  [DocumentAction.CREATE_DOCUMENT]: { 
    icon: <FiFilePlus />, 
    label: 'Создать',
    color: '#4CAF50'
  },
  [DocumentAction.SUBMIT_FOR_REVIEW]: { 
    icon: <FiSend />, 
    label: 'На ревью',
    color: '#2196F3'
  },
  [DocumentAction.APPROVE]: { 
    icon: <FiCheckCircle />, 
    label: 'Утвердить',
    color: '#4CAF50'
  },
  [DocumentAction.REJECT]: { 
    icon: <FiX />, 
    label: 'Отклонить',
    color: '#F44336'
  },
  [DocumentAction.ARCHIVE]: { 
    icon: <FiArchive />, 
    label: 'Архивировать',
    color: '#795548'
  },
  [DocumentAction.UNARCHIVE]: { 
    icon: <FiRefreshCw />, 
    label: 'Разархивировать',
    color: '#795548'
  },
  [DocumentAction.SOFT_DELETE]: { 
    icon: <FiTrash2 />, 
    label: 'Удалить',
    color: '#F44336'
  },
  [DocumentAction.RESTORE]: { 
    icon: <FiRefreshCw />, 
    label: 'Восстановить',
    color: '#4CAF50'
  },
  [DocumentAction.UPLOAD_NEW_VERSION]: { 
    icon: <FiUploadCloud />, 
    label: 'Новая версия',
    color: '#2196F3'
  },
  [DocumentAction.VIEW]: { 
    icon: <FiEye />, 
    label: 'Просмотр',
    color: '#607D8B'
  },
  [DocumentAction.DOWNLOAD]: { 
    icon: <FiDownload />, 
    label: 'Скачать',
    color: '#607D8B'
  }
};

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

  const { user } = useAuth();
  //const { isUploading, progress } = useDocumentUpload();
  const { deleteDocument, restoreDocument, isDeleting, isRestoring, error } = useDocumentDelete();
  //const {getAllCachedPDFs} = usePDFCache();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      alert('Сначала выберите папку');
      return;
    }

    if (!user?.id) {
      alert('Пользователь не авторизован');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf,.txt,text/plain';
    input.multiple = false; // Пока что загружаем по одному файлу
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      
      if (!files || files.length === 0) return;
      
      const file = files[0];
      
      // Создаем превью и сохраняем в контекст
      setFilePreview({
        file,
        customName: file.name.replace(/\.[^/.]+$/, ''), // Убираем расширение
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

  // Обработчик мягкого удаления
  // const handleSoftDelete = async () => {
  //   if (!selectedDocument) return;
    
  //   try {
  //     const result = await deleteDocument(selectedDocument.id);
      
  //     if (result.success) {
  //       setNotification({ type: 'success', message: 'Документ успешно удален' });
  //       setShowDeleteConfirm(false);
  //       // Сбрасываем выделение после удаления
  //       updateContext({ selectedDocument: null });
  //       // Вызываем колбэк для обновления списка
  //       onDocumentDeleted?.();
  //     } else {
  //       setNotification({ type: 'error', message: result.error || 'Ошибка при удалении документа' });
  //     }
  //   } catch (error) {
  //     console.error('Error deleting document:', error);
  //     setNotification({ type: 'error', message: 'Ошибка при удалении документа' });
  //   }
  // };

  // Обработчик восстановления
  // const handleRestore = async () => {
  //   if (!selectedDocument) return;
    
  //   try {
  //     const result = await restoreDocument(selectedDocument.id);
      
  //     if (result.success) {
  //       setNotification({ type: 'success', message: 'Документ успешно восстановлен' });
  //       // Вызываем колбэк для обновления списка
  //       onDocumentRestored?.();
  //     } else {
  //       setNotification({ type: 'error', message: result.error || 'Ошибка при восстановлении документа' });
  //     }
  //   } catch (error) {
  //     console.error('Error restoring document:', error);
  //     setNotification({ type: 'error', message: 'Ошибка при восстановлении документа' });
  //   }
  // };

  const handleUploadNewVersion = () => {
    if (!selectedDocument) return;
    if (!user?.id && !user?.email) {
      alert('Пользователь не авторизован');
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
      // PDFViewer сам отреагирует на selectedDocument
      updateContext({ isRightFrameOpen: true});
    }

    if (action === DocumentAction.SUBMIT_FOR_REVIEW) {
      updateContext({ isSubmittingToReview: true});
      return;
    }

    if (action === DocumentAction.APPROVE || action === DocumentAction.REJECT) {
      // Открываем модальное окно ревью
      updateContext({ isAcceptedForReview: true });
      return;
    }

    if (action === DocumentAction.ARCHIVE) {
      updateContext({ isArchivePanelOpen: true});
      return;
    }


    onAction?.(action);
  };

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Уведомления */}
      {notification && (
        <div className={`doc-action-notification doc-action-notification--${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* {(isDeleting || isRestoring) && (
        <div className="doc-action-loading">
          <div className="doc-action-spinner"></div>
          <span>{isDeleting ? 'Удаление...' : 'Восстановление...'}</span>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="doc-action-confirm-overlay">
          <div className="doc-action-confirm">
            <h3 className="doc-action-confirm-title">Delete confirmation</h3>
            <p className="doc-action-confirm-text">Mark &quot;{selectedDocument?.document_name}&quot; as "deleted"?</p>
            <p className="doc-action-confirm-warning">The document and its versions will no longer be visible in active folders.
The record will be retained in the system and can be restored by an authorized user.</p>
            <div className="doc-action-confirm-actions">
              <button
                type="button"
                className="doc-action-btn doc-action-btn--cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="doc-action-btn doc-action-btn--delete"
                onClick={handleSoftDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )} */}

      <div className={`doc-action-root ${className}`}>
        <div className="doc-action-container">
          {(() => {
            // Определяем, нужно ли показывать кнопки
            const shouldShowActions = 
              (currentLevel === ViewLevel.GENERAL && selectedFolder) ||
              (currentLevel === ViewLevel.SITE && currentSite && selectedFolder);
            
            if (!shouldShowActions) return null;
            
            return availableActions.map((action, i) => (
              <button
                key={`${action}-${i}`}
                type="button"
                className={`doc-action-btn doc-action-btn--${action.replace(/_/g, '-')} ${(isDeleting || isRestoring) ? 'doc-action-btn--disabled' : ''}`}
                onClick={() => handleActionClick(action)}
                title={actionConfig[action].label}
                style={{ '--doc-action-color': actionConfig[action].color } as React.CSSProperties}
                disabled={isDeleting || isRestoring}
              >
                <span className="doc-action-icon">{actionConfig[action].icon}</span>
                <span className="doc-action-label">{actionConfig[action].label}</span>
              </button>
            ));
          })()}
        </div>
      </div>
    </>
  );
};

export default DocumentActions;