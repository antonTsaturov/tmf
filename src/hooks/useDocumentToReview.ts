// hooks/useDocumentToReview.ts
import { useState, useCallback } from 'react';
import { Document, DocumentAction } from '@/types/document';
import { StudyUser } from '@/types/types';

interface UseDocumentToReviewReturn {
  // Состояния
  isReviewModalOpen: boolean;
  documentForReview: Document | null;
  reviewers: StudyUser[];
  loadingReviewers: boolean;
  submitting: boolean;
  error: string | null;
  
  // Методы
  openReviewModal: (document: Document) => void;
  closeReviewModal: () => void;
  loadReviewers: (studyId: number, siteId: string | number) => Promise<void>;
  submitForReview: (
    documentId: string,
    reviewerId: string,
    comment?: string,
    userId?: string,
    userRole?: string
  ) => Promise<boolean>;
  resetError: () => void;
}

export const useDocumentToReview = (): UseDocumentToReviewReturn => {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [documentForReview, setDocumentForReview] = useState<Document | null>(null);
  const [reviewers, setReviewers] = useState<StudyUser[]>([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Открыть модальное окно для документа
  const openReviewModal = useCallback((document: Document) => {
    setDocumentForReview(document);
    setIsReviewModalOpen(true);
    setError(null);
  }, []);

  // Закрыть модальное окно
  const closeReviewModal = useCallback(() => {
    setIsReviewModalOpen(false);
    setDocumentForReview(null);
    setReviewers([]);
    setError(null);
  }, []);

  // Загрузить список рецензентов
  const loadReviewers = useCallback(async (studyId: number, siteId: string | number) => {
    if (!studyId || !siteId) {
      setError('Не указаны исследование или центр');
      return;
    }

    setLoadingReviewers(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/users/reviewers?studyId=${studyId}&siteId=${siteId}&role=study_manager`
      );

      if (!response.ok) {
        throw new Error('Failed to load reviewers');
      }

      const data = await response.json();
      setReviewers(data.users || []);
      
      if (data.users?.length === 0) {
        setError('Нет доступных рецензентов для этого исследования и центра');
      }
    } catch (err) {
      console.error('Error loading reviewers:', err);
      setError('Не удалось загрузить список рецензентов');
      setReviewers([]);
    } finally {
      setLoadingReviewers(false);
    }
  }, []);

  // Отправить документ на ревью
  const submitForReview = useCallback(async (
    documentId: string,
    reviewerId: string,
    comment?: string,
    userId?: string,
    userRole?: string
  ): Promise<boolean> => {
    if (!documentId || !reviewerId || !userId || !userRole) {
      setError('Отсутствуют необходимые данные');
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
          reviewerId: reviewerId,
          comment: comment,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit for review');
      }

      const result = await response.json();
      
      // Закрываем модальное окно после успешной отправки
      setIsReviewModalOpen(false);
      setDocumentForReview(null);
      setReviewers([]);
      
      return true;
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

  return {
    // Состояния
    isReviewModalOpen,
    documentForReview,
    reviewers,
    loadingReviewers,
    submitting,
    error,
    
    // Методы
    openReviewModal,
    closeReviewModal,
    loadReviewers,
    submitForReview,
    resetError,
  };
};