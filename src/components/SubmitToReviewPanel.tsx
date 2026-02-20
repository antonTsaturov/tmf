// components/SubmitToReviewPanel.tsx
import React, { useState, useEffect, useContext } from 'react';
import { FiX, FiSend, FiUser, FiSearch } from 'react-icons/fi';
import { Document } from '@/types/document';
import { StudyUser, UserRole } from '@/types/types';
import '../styles/SubmitToReviewPanel.css';
import { MainContext } from '@/wrappers/MainContext';
import { useDocumentToReview } from '@/hooks/useDocumentToReview';
import { useAuth } from '@/wrappers/AuthProvider';

interface SubmitToReviewPanelProps {
  studyId: number;
  siteId: string | number;
}

const SubmitToReviewPanel: React.FC<SubmitToReviewPanelProps> = ({
  studyId,
  siteId,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [comment, setComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedDocument, isSubmittingToReview } = context;
  const { user } = useAuth();
  const {
    isReviewModalOpen,
    documentForReview,
    reviewers,
    loadingReviewers,
    submitting,
    openReviewModal,
    closeReviewModal,
    loadReviewers,
    submitForReview,
    resetError
  } = useDocumentToReview();

  const document = selectedDocument;
  const isOpen = isSubmittingToReview;
  // Загрузка доступных рецензентов
  useEffect(() => {
    const loadReviewers = async () => {
      if (!isOpen || !document || !studyId || !siteId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/users/reviewers?studyId=${studyId}&siteId=${siteId}&role=${UserRole.STUDY_MANAGER}`
        );

        if (!response.ok) {
          throw new Error('Failed to load reviewers');
        }

        const data = await response.json();
        // setReviewers(data.users || []);
        
        // Автоматически выбираем первого, если есть
        if (data.users?.length > 0) {
          setSelectedReviewer(data.users[0].id);
        }
      } catch (err) {
        console.error('Error loading reviewers:', err);
        setError('Не удалось загрузить список рецензентов');
      } finally {
        setLoading(false);
      }
    };

    loadReviewers();
  }, [isOpen, document, studyId, siteId]);

  const handleSubmit = async () => {
    if (!selectedReviewer) {
      setError('Выберите рецензента');
      return;
    }

    // setSubmitting(true);
    setError(null);

    try {
      await submitForReview(selectedReviewer, comment.trim());
      updateContext({ isSubmittingToReview: false });
    } catch (err) {
      console.error('Error submitting for review:', err);
      setError('Ошибка при отправке на ревью');
    } finally {
      // setSubmitting(false);
    }
  };

  const filteredReviewers = reviewers.filter(reviewer =>
    reviewer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reviewer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (!isOpen || !document) return null;

  return (
    <div className="submit-review-overlay" onClick={()=> updateContext({ isSubmittingToReview: false })}>
      <div className="submit-review-modal" onClick={e => e.stopPropagation()}>
        <div className="submit-review-header">
          <h3 className="submit-review-title">Отправить на ревью</h3>
          <button
            type="button"
            className="submit-review-close"
            onClick={() => updateContext({ isSubmittingToReview: false })}
            disabled={submitting}
          >
            <FiX />
          </button>
        </div>

        <div className="submit-review-content">
          {/* Информация о документе */}
          <div className="submit-review-doc-info">
            <div className="submit-review-doc-icon">📄</div>
            <div className="submit-review-doc-details">
              <div className="submit-review-doc-name">{document.document_name}</div>
              <div className="submit-review-doc-meta">
                Версия: {document.document_number} • Статус: {document.status}
              </div>
            </div>
          </div>

          {/* Поиск рецензентов */}
          <div className="submit-review-search">
            <FiSearch className="submit-review-search-icon" />
            <input
              type="text"
              className="submit-review-search-input"
              placeholder="Поиск рецензента по имени или email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading || submitting}
            />
          </div>

          {/* Список рецензентов */}
          <div className="submit-review-list">
            {loading ? (
              <div className="submit-review-loading">
                <div className="submit-review-spinner"></div>
                <span>Загрузка рецензентов...</span>
              </div>
            ) : filteredReviewers.length === 0 ? (
              <div className="submit-review-empty">
                <FiUser size={32} />
                <p>Нет доступных рецензентов</p>
                {reviewers.length === 0 && (
                  <p className="submit-review-empty-hint">
                    Убедитесь, что в исследовании и центре есть пользователи с ролью STUDY_MANAGER
                  </p>
                )}
              </div>
            ) : (
              filteredReviewers.map(reviewer => (
                <label
                  key={reviewer.id}
                  className={`submit-review-item ${selectedReviewer === reviewer.id ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="reviewer"
                    value={reviewer.id}
                    checked={selectedReviewer === reviewer.id}
                    onChange={(e) => setSelectedReviewer(e.target.value)}
                    disabled={submitting}
                    className="submit-review-radio"
                  />
                  <div className="submit-review-item-info">
                    <div className="submit-review-item-name">{reviewer.name}</div>
                    <div className="submit-review-item-email">{reviewer.email}</div>
                    <div className="submit-review-item-role">{reviewer.role.join(', ')}</div>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* Комментарий */}
          <div className="submit-review-comment">
            <label htmlFor="review-comment" className="submit-review-comment-label">
              Комментарий (необязательно)
            </label>
            <textarea
              id="review-comment"
              className="submit-review-comment-input"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Добавьте комментарий для рецензента..."
              disabled={submitting}
            />
          </div>

          {/* Ошибка */}
          {error && (
            <div className="submit-review-error">
              {error}
            </div>
          )}
        </div>

        <div className="submit-review-footer">
          <button
            type="button"
            className="submit-review-btn submit-review-btn--cancel"
            onClick={() => updateContext({ isSubmittingToReview: false })}
            disabled={submitting}
          >
            Отмена
          </button>
          <button
            type="button"
            className="submit-review-btn submit-review-btn--submit"
            onClick={handleSubmit}
            disabled={!selectedReviewer || loading || submitting}
          >
            <FiSend />
            {submitting ? 'Отправка...' : 'Отправить на ревью'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitToReviewPanel;