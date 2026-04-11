// hooks/useDocumentActionHandler.ts
import { useContext, useCallback } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction, Document, DocumentVersionRow } from '@/types/document';
import { useDocumentUpload } from './useDocumentUpload';
import { logger } from '@/lib/utils/logger';
import { useNotification } from '@/wrappers/NotificationContext';

interface UseDocumentActionHandlerReturn {
  handleAction: (action: DocumentAction, doc?: Document) => void;
  handleDownloadVersion: (version: DocumentVersionRow) => void;
}

export const useDocumentActionHandler = (): UseDocumentActionHandlerReturn => {
  const mainContext = useContext(MainContext);
  const { handleFileSelect, handleUploadNewVersion } = useDocumentUpload();
  const { addNotification } = useNotification();

  if (!mainContext) {
    throw new Error('useDocumentActionHandler must be used within MainContext Provider');
  }

  const { updateContext } = mainContext;

  const handleAction = useCallback((action: DocumentAction) => {

    switch (action) {
      case DocumentAction.VIEW:
        updateContext({ isRightFrameOpen: true });
        break;
      case DocumentAction.SUBMIT_FOR_REVIEW:
        updateContext({ isSubmittingToReview: true });
        break;
      case DocumentAction.APPROVE:
      // case DocumentAction.REJECT:
        updateContext({ isAcceptedForReview: true });
        break;
      case DocumentAction.ARCHIVE:
        updateContext({ isArchivePanelOpen: true });
        break;
      case DocumentAction.UNARCHIVE:
        updateContext({ isUnarchivePanelOpen: true });
        break;
      case DocumentAction.SOFT_DELETE:
        updateContext({ isDeletePanelOpen: true });
        break;
      case DocumentAction.RESTORE:
        updateContext({ isRestorePanelOpen: true });
        break;
      case DocumentAction.EDIT:
        updateContext({ isEditTitlePanelOpen: true });
        break;
      case DocumentAction.UPLOAD_NEW_VERSION:
        handleUploadNewVersion();
        break;
      case DocumentAction.DOWNLOAD: {
        const document = mainContext.context.selectedDocument;
        if (!document) {
          logger.warn('No document selected for download');
          break;
        }
        const version = document.current_version;
        if (!version) {
          logger.warn('No version found for document download');
          break;
        }
        const url = `/api/documents/${document.id}/versions/${version.document_number}/download`;
        window.open(url, '_blank');
        break;
      }
      case DocumentAction.CREATE_DOCUMENT:
        handleFileSelect();
        break;
      default:
        logger.warn('Action not implemented', { action });
    }
  }, [updateContext, mainContext]);

  // Download a specific version (used from DocumentDetails version list)
  const handleDownloadVersion = useCallback(async (version: DocumentVersionRow) => {
    const doc = mainContext.context.selectedDocument;
    if (!doc) {
      logger.warn('No document selected for version download');
      return;
    }

    try {
      const response = await fetch(
        `/api/documents/${doc.id}/versions/${version.document_number}/download`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 500 && errorData.error === 'File integrity check failed') {
          addNotification('error', `Ошибка целостности файла: ${version.file_name}. Файл мог быть повреждён в хранилище.`);
          return;
        }

        addNotification('error', `Ошибка загрузки: ${errorData.message || response.statusText}`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `v${version.document_number}_${version.file_name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addNotification('success', `Файл ${version.file_name} загружен`);
    } catch (error) {
      logger.error('Download error', error);
      addNotification('error', 'Не удалось загрузить файл');
    }
  }, [mainContext, addNotification]);

  return {
    handleAction,
    handleDownloadVersion,
  };
};
