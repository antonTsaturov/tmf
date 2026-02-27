// components/ArchiveDocumentPanel.tsx
import React, { useContext, useState, useEffect } from "react";
import { MainContext } from "@/wrappers/MainContext";
import { useDocumentArchive } from "@/hooks/useDocumentArchive";
import "../styles/ArchiveDocumentPanel.css";

interface ArchiveDocumentPanelProps {
  onDocumentArchived?: () => void; // Колбэк для обновления списка после архивации
}

const ArchiveDocumentPanel: React.FC<ArchiveDocumentPanelProps> = ({ 
  onDocumentArchived 
}) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('ArchiveDocumentPanel must be used within MainContext Provider');

  const { context, updateContext } = mainContext;
  const { isArchivePanelOpen, selectedDocument, currentStudy, currentSite } = context;

  const { archiveDocument, isArchiving, error } = useDocumentArchive();

  // Сброс состояния при открытии панели
  useEffect(() => {
    if (isArchivePanelOpen) {
      // Дополнительные действия при открытии, если нужны
    }
  }, [isArchivePanelOpen]);

  // Обработчик архивации
  const handleArchive = async () => {
    if (!selectedDocument) return;
    
    try {
      const result = await archiveDocument(selectedDocument.id);
      
      if (result.success) {
        updateContext({ isArchivePanelOpen: false });
        updateContext({ selectedDocument: null });
        onDocumentArchived?.();
      } else {
        console.error('Archive error:', result.error);
      }
    } catch (error) {
      console.error('Error archiving document:', error);
    }
  };

  // Обработчик отмены
  const handleCancel = () => {
    updateContext({ isArchivePanelOpen: false });
  };

  if (!isArchivePanelOpen || !selectedDocument) return null;

  // Форматирование даты для отображения
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {isArchiving && (
        <div className="doc-action-loading">
          <div className="doc-action-spinner"></div>
          <span>Archiving document...</span>
        </div>
      )}
      
      {isArchivePanelOpen && (
        <div className="doc-action-confirm-overlay">
          <div className="doc-action-confirm archive-panel">
            <h3 className="doc-action-confirm-title">Archive Document</h3>
            
            <div className="archive-document-info">
              <div className="archive-info-icon">📦</div>
              <div className="archive-info-details">
                <div className="archive-info-name">{selectedDocument.document_name || selectedDocument.file_name}</div>
                <div className="archive-info-meta">
                  <span className="archive-info-badge" title={selectedDocument.id}>
                    ID: {selectedDocument.id}
                  </span>
                  {selectedDocument.document_number && (
                    <span className="archive-info-badge">TMF Document Version: {selectedDocument.document_number}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="archive-context-info">
              <div className="archive-context-row">
                <span className="archive-context-label">Study:</span>
                <span className="archive-context-value" title={currentStudy?.title || `ID: ${selectedDocument.study_id}`}>
                    {currentStudy?.title || `ID: ${selectedDocument.study_id}`}
                </span>
              </div>
              
              {currentSite && (
                <div className="archive-context-row">
                  <span className="archive-context-label">Site:</span>
                  <span className="archive-context-value" title={currentSite.name || `ID: ${selectedDocument.site_id}`}>
                    {currentSite.name || `ID: ${selectedDocument.site_id}`}
                </span>
                </div>
              )}
              
              <div className="archive-context-row">
                <span className="archive-context-label">Folder:</span>
                <span className="archive-context-value">{selectedDocument.folder_name || '—'}</span>
              </div>
              
              <div className="archive-context-row">
                <span className="archive-context-label">Created:</span>
                <span className="archive-context-value">{formatDate(selectedDocument.created_at)}</span>
              </div>
            </div>

            <p className="archive-confirm-text">
              Are you sure you want to archive this document?
            </p>
            
            <p className="archive-confirm-warning">
              The document will be marked as archived and will no longer be visible in active folders.
              This action can be undone by an administrator.
            </p>

            {/* Отображение ошибки от сервера */}
            {error && (
              <div className="archive-server-error">
                <span className="error-text">Error: {error}</span>
              </div>
            )}

            <div className="doc-action-confirm-actions">
              <button
                type="button"
                className="archive-doc-action-btn archive-doc-action-btn--cancel"
                onClick={handleCancel}
                disabled={isArchiving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="archive-doc-action-btn archive-doc-action-btn--archive"
                onClick={handleArchive}
                disabled={isArchiving}
              >
                {isArchiving ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ArchiveDocumentPanel;