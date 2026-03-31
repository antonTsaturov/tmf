// hooks/useDocumentActionHandler.ts
import { useContext, useCallback } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction } from '@/types/document';
import { Document } from '@/types/document';
import { useDocumentUpload } from './useDocumentUpload';
import { logger } from '@/lib/logger';

interface UseDocumentActionHandlerReturn {
  handleAction: (action: DocumentAction, doc?: Document) => void;
}

export const useDocumentActionHandler = (): UseDocumentActionHandlerReturn => {
  const mainContext = useContext(MainContext);
   const { handleFileSelect, handleUploadNewVersion } = useDocumentUpload();
  
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
      case DocumentAction.CREATE_DOCUMENT:
        handleFileSelect();
        break;
      default:
        logger.warn('Action not implemented', { action });
    }
  }, [updateContext]);

  return {
    handleAction
  };
};
