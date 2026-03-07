// hooks/useDocumentToReview.ts
import { useState, useCallback, useContext } from 'react';
import { Document, DocumentAction } from '@/types/document';
import { StudyUser, UserRole } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';

interface UseDocumentToReviewReturn {
  // Состояния
  isReviewModalOpen: boolean;
  documentForReview: Document | null;
  submitting: boolean;
  error: string | null;
  
  // Методы
  // openReviewModal: (document: Document) => void;
  // closeReviewModal: () => void;
  // loadReviewers: (studyId: number, siteId: string | number) => Promise<void>;
  submitForReview: (
    documentId: string,
    reviewerId: string,
    comment?: string,
    userId?: string,
    userRole?: string
  ) => Promise<Document | boolean>;
  resetError: () => void;
  approveDocument: (
    documentId: string,
    comment?: string,
    userId?: string,
    userRole?: string 
  ) => Promise<Document | boolean>;
  rejectDocument: (
    documentId: string,
    comment?: string,
    userId?: string,
    userRole?: string,
    siteId?: string,
    studyId?: string
  ) => Promise<Document | boolean>;

}

export const useDocumentToReview = (): UseDocumentToReviewReturn => {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [documentForReview, setDocumentForReview] = useState<Document | null>(null);
  const [reviewers, setReviewers] = useState<StudyUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { context } = useContext(MainContext)!;
  const { currentStudy, currentSite} = context;

  // Отправить документ на ревью
  const submitForReview = useCallback(async (
    documentId: string,
    reviewerId: string, // Кому отправлено на ревью
    comment?: string,
    userId?: string, // Кто отправил на ревью
    userRole?: string 
  ): Promise<Document | boolean> => {

    if (!documentId || !reviewerId || !userId || !userRole) {
      console.log('Отсутствуют необходимые данные');
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: DocumentAction.SUBMIT_FOR_REVIEW,
          userId: userId,
          userRole: userRole,
          comment: comment || '',
          reviewerId: reviewerId,
          siteId: currentSite?.id,
          studyId: currentStudy?.id

        }),
      });


      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData.error || 'Failed to submit for review');
        return false;
      }

      const result = await response.json();
      
      // Закрываем модальное окно после успешной отправки
      setIsReviewModalOpen(false);
      setDocumentForReview(null);
      setReviewers([]);
      
      return result.document;
    } catch (err) {
      console.error('Error submitting for review:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при отправке на ревью');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Сбросить ошибку
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Одобрить документ
  const approveDocument = useCallback(async (
    documentId: string,
    comment?: string,
    userId?: string,
    userRole?: string 
  ): Promise<Document | boolean> => {

    if (!documentId ) {
      console.log('Отсутствуют необходимые данные');
      return false;
    }
        
    try {
      const response = await fetch(`/api/documents/${documentId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: DocumentAction.APPROVE,
          userId: userId,
          userRole: userRole,
          comment: comment?.trim() || undefined,
          siteId: currentSite?.id,
          studyId: currentStudy?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve document');
      }
      const result = await response.json();
      return result.document;

    } catch (err) {
      console.error('Error approving document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при утверждении документа');
      return false;
    } finally {
      //setLoading(false);
    
    }
  }, [])


  const rejectDocument = useCallback(async (
    documentId: string,
    comment?: string,
    userId?: string,
    userRole?: string,
  ) => {

    try {
      const response = await fetch(`/api/documents/${documentId}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: DocumentAction.REJECT,
          userId: userId,
          userRole: userRole,
          comment: comment?.trim(),
          siteId: currentSite?.id,
          studyId: currentStudy?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error (errorData.error || 'Failed to reject document');
        return false;
      }

      const result = await response.json();
      return result.document;

    } catch (err) {
      console.error('Error rejecting document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при отклонении документа');
      return false;
    }

  },[])

  return {
    // Состояния
    isReviewModalOpen,
    documentForReview,
    // reviewers,
    // loadingReviewers,
    submitting,
    error,
    
    // Методы
    // openReviewModal,
    // closeReviewModal,
    // loadReviewers,
    submitForReview,
    approveDocument,
    rejectDocument,
    resetError,
  };
};