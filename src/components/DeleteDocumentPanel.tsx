// components/DeleteDocumentPanel.tsx
import React, { useContext, useState, useEffect } from "react";
import { useDocumentDelete } from "@/hooks/useDocumentDelete";
import { MainContext } from "@/wrappers/MainContext";
import "../styles/DeleteDocumentPanel.css";
import { useAuth } from "@/wrappers/AuthProvider";

interface DeleteDocumentPanelProps {
  onDocumentDeleted?: () => void; // Колбэк для обновления списка после удаления
  onDocumentRestored?: () => void; // Колбэк для обновления списка после восстановления
  requireReason?: boolean; // Сделать причину обязательной (по умолчанию true)
  maxReasonLength?: number; // Максимальная длина причины
  reasonPlaceholder?: string; // Плейсхолдер для поля причины
}

const DeleteDocumentPanel: React.FC<DeleteDocumentPanelProps> = ({ 
  onDocumentDeleted, 
  onDocumentRestored,
  requireReason = true,
  maxReasonLength = 500,
  reasonPlaceholder = "Enter reason for deletion..."
}) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('DocumentActions must be used within MainContext Provider');

  const { context, updateContext } = mainContext;
  const { isDeletePanelOpen, selectedDocument, currentStudy, currentSite, currentLevel } = context;

  const [deletionReason, setDeletionReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [isReasonTouched, setIsReasonTouched] = useState(false);

  const { deleteDocument, restoreDocument, isDeleting, isRestoring, error } = useDocumentDelete();

  // Сброс состояния при открытии панели
  useEffect(() => {
    if (isDeletePanelOpen) {
      setDeletionReason("");
      setReasonError("");
      setIsReasonTouched(false);
    }
  }, [isDeletePanelOpen]);

  // Валидация причины удаления
  const validateReason = (reason: string): boolean => {
    if (!requireReason) return true;
    
    const trimmedReason = reason.trim();
    
    if (!trimmedReason) {
      setReasonError("Deletion reason is required");
      return false;
    }
    
    if (trimmedReason.length < 10) {
      setReasonError("Reason must be at least 10 characters long");
      return false;
    }
    
    if (trimmedReason.length > maxReasonLength) {
      setReasonError(`Reason cannot exceed ${maxReasonLength} characters`);
      return false;
    }
    
    setReasonError("");
    return true;
  };

  // Обработчик изменения причины
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newReason = e.target.value;
    setDeletionReason(newReason);
    
    if (isReasonTouched) {
      validateReason(newReason);
    }
  };

  // Обработчик потери фокуса
  const handleReasonBlur = () => {
    setIsReasonTouched(true);
    validateReason(deletionReason);
  };

  // Обработчик мягкого удаления
  const handleSoftDelete = async () => {
    if (!selectedDocument) return;
    
    // Валидация перед отправкой
    setIsReasonTouched(true);
    if (!validateReason(deletionReason)) {
      return;
    }
    
    try {
      const result = await deleteDocument(
        selectedDocument.id,
        deletionReason.trim() // Передаем причину удаления
      );
      
      if (result.success) {
        updateContext({ isDeletePanelOpen: false });
        updateContext({ selectedDocument: null });
        onDocumentDeleted?.();
        // Очищаем причину после успешного удаления
        setDeletionReason("");
      } else {
        // Обработка ошибки
        console.error('Delete error:', result.error);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  // Обработчик отмены
  const handleCancel = () => {
    setDeletionReason("");
    setReasonError("");
    setIsReasonTouched(false);
    updateContext({ isDeletePanelOpen: false });
  };

  if (!isDeletePanelOpen || !selectedDocument) return null;

  const isReasonValid = !requireReason || (deletionReason.trim().length >= 10 && deletionReason.trim().length <= maxReasonLength);
  const isSubmitDisabled = isDeleting || (requireReason && !isReasonValid);

  return (
    <>
      {(isDeleting || isRestoring) && (
        <div className="doc-action-loading">
          <div className="doc-action-spinner"></div>
          <span>{isDeleting ? 'Deleting...' : 'Restoring...'}</span>
        </div>
      )}
      
      {isDeletePanelOpen && (
        <div className="doc-action-confirm-overlay">
          <div className="doc-action-confirm">
            <h3 className="doc-action-confirm-title">Delete Confirmation</h3>
            
            <p className="doc-action-confirm-text">
              Mark document <strong>"{selectedDocument?.document_name}"</strong> as "deleted"?
            </p>
            
            <p className="doc-action-confirm-warning">
              The document and its versions will no longer be visible in active folders.
              But the record will be retained in the system and can be restored/viewed by an authorized user.
            </p>

            {/* Поле для указания причины удаления */}
            <div className="doc-action-reason-container">
              <label htmlFor="deletionReason" className="doc-action-reason-label">
                Reason for deletion {requireReason && <span className="required-field">*</span>}
              </label>
              
              <textarea
                id="deletionReason"
                className={`doc-action-reason-input ${reasonError ? 'error' : ''}`}
                value={deletionReason}
                onChange={handleReasonChange}
                onBlur={handleReasonBlur}
                placeholder={reasonPlaceholder}
                disabled={isDeleting}
                rows={4}
                maxLength={maxReasonLength}
                autoFocus
              />
              
              <div className="doc-action-reason-footer">
                <div className="doc-action-reason-error">
                  {reasonError && <span className="error-text">{reasonError}</span>}
                </div>
                <div className="doc-action-reason-counter">
                  <span className={deletionReason.length > maxReasonLength ? 'error-text' : ''}>
                    {deletionReason.length}/{maxReasonLength}
                  </span>
                </div>
              </div>
            </div>

            {/* Отображение ошибки от сервера */}
            {error && (
              <div className="doc-action-server-error">
                <span className="error-text">Error: {error}</span>
              </div>
            )}

            <div className="doc-action-confirm-actions">
              <button
                type="button"
                className="doc-action-btn doc-action-btn--cancel"
                onClick={handleCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="doc-action-btn doc-action-btn--delete"
                onClick={handleSoftDelete}
                disabled={isSubmitDisabled}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteDocumentPanel;