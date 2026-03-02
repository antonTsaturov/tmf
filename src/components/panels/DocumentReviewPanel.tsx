// components/DocumentReviewPanel.tsx
import React, { useContext, useState, useEffect } from 'react';
import { FiX, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction } from '@/types/document';
import { useAuth } from '@/wrappers/AuthProvider';
import '@/styles/DocumentReviewPanel.css';

interface DocumentReviewPanelProps {
  onReviewComplete?: () => void;
}

const DocumentReviewPanel: React.FC<DocumentReviewPanelProps> = ({ onReviewComplete }) => {
  const { context, updateContext } = useContext(MainContext)!;
  const { user } = useAuth();
  const { selectedDocument, isAcceptedForReview } = context;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [rejectDocument, setRejectDocument] = useState(false);

  // Сбрасываем состояние при закрытии
  useEffect(() => {
    if (!isAcceptedForReview) {
      setComment('');
      setRejectDocument(false);
      setError(null);
    }
  }, [isAcceptedForReview]);

  const handleClose = () => {
    updateContext({ isAcceptedForReview: false });
  };

  const handleApprove = async () => {
    if (!selectedDocument || !user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: DocumentAction.APPROVE,
          userId: user.id,
          userRole: user.role?.[0],
          comment: comment.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve document');
      }

      // Сбрасываем selectedDocument чтобы обновить кнопки
      updateContext({ selectedDocument: null });
      handleClose();
      onReviewComplete?.();
    } catch (err) {
      console.error('Error approving document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при утверждении документа');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDocument || !user) return;

    // Для reject комментарий обязателен
    if (!comment.trim()) {
      setError('Укажите причину отклонения');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: DocumentAction.REJECT,
          userId: user.id,
          userRole: user.role?.[0],
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject document');
      }

      // Сбрасываем selectedDocument чтобы обновить кнопки
      updateContext({ selectedDocument: null });
      handleClose();
      onReviewComplete?.();
    } catch (err) {
      console.error('Error rejecting document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при отклонении документа');
    } finally {
      setLoading(false);
    }
  };

  if (!isAcceptedForReview || !selectedDocument) return null;

  const formatFileSize = (bytes?: number | string) => {
    if (!bytes) return '—';
    const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(n) || n === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="review-overlay" onClick={handleClose}>
      <div className="review-modal" onClick={e => e.stopPropagation()}>
        <div className="review-header">
          <h3 className="review-title">Рассмотрение документа</h3>
          <button
            type="button"
            className="review-close"
            onClick={handleClose}
            disabled={loading}
          >
            <FiX />
          </button>
        </div>

        <div className="review-content">
          {/* Информация о документе */}
          <div className="review-doc-info">
            <div className="review-doc-icon">📄</div>
            <div className="review-doc-details">
              <div className="review-doc-name">{selectedDocument.document_name}</div>
              <div className="review-doc-meta">
                <span>Версия: {selectedDocument.document_number}</span>
                <span className="review-doc-meta-separator">•</span>
                <span>Размер: {formatFileSize(selectedDocument.file_size)}</span>
              </div>
              {selectedDocument.tmf_artifact && (
                <div className="review-doc-tag" title={selectedDocument.tmf_artifact}>
                  {selectedDocument.tmf_artifact}
                </div>
              )}
            </div>
          </div>

          {/* Информация о ревьюере */}
          <div className="reviewer-info">
            <FiInfo className="reviewer-icon" />
            <span>
              Вы действуете как <strong>рецензент</strong>. 
              {!rejectDocument 
                ? ' Пожалуйста, внимательно проверьте документ перед утверждением.'
                : ' Пожалуйста, внимательно проверьте документ перед перед отклонением, а также укажите причину.'}
            </span>
          </div>

          {/* Поле для комментария */}
          <div className="review-comment-section">
            <label htmlFor="review-comment" className="review-comment-label">
              {rejectDocument ? 'Причина отклонения' : 'Комментарий'}
            </label>
            <textarea
              id="review-comment"
              className={`review-comment-input ${rejectDocument ? 'reject' : ''}`}
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={rejectDocument 
                ? "Укажите причину отклонения документа..." 
                : "Добавьте комментарий (необязательно)"
              }
              disabled={loading}
              autoFocus={rejectDocument}
            />
          </div>

          {/* Ошибка */}
          {error && (
            <div className="review-error">
              {error}
            </div>
          )}
        </div>

        <div className="review-footer">
          <button
            type="button"
            className="review-btn review-btn--cancel"
            onClick={handleClose}
            disabled={loading}
          >
            Отмена
          </button>
          
          <div className="review-actions">
            {!rejectDocument ? (
              <>
                <button
                  type="button"
                  className="review-btn review-btn--reject"
                  onClick={() => setRejectDocument(true)}
                  disabled={loading}
                >
                  Отклонить
                </button>
                <button
                  type="button"
                  className="review-btn review-btn--approve"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  {loading ? 'Утверждение...' : 'Утвердить'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="review-btn review-btn--back"
                  onClick={() => {
                    setRejectDocument(false);
                    setComment('');
                  }}
                  disabled={loading}
                >
                  Назад
                </button>
                <button
                  type="button"
                  className="review-btn review-btn--confirm-reject"
                  onClick={handleReject}
                  disabled={loading || !comment.trim()}
                >
                  <FiXCircle /> {loading ? 'Отклонение...' : 'Подтвердить отклонение'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentReviewPanel;