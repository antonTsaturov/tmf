import React, { useContext, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { useAuth } from '@/wrappers/AuthProvider';
import { useDocumentNewVersion } from '@/hooks/useDocumentNewVersion';
import { FiX, FiUpload } from 'react-icons/fi';
import '../styles/FilePreviewPanel.css';

interface NewVersionUploadPanelProps {
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

const NewVersionUploadPanel: React.FC<NewVersionUploadPanelProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) return null;
  const { context, clearNewVersionPreview, updateContext } = mainContext;

  const clearPanel = () => {
    if (typeof clearNewVersionPreview === 'function') {
      clearNewVersionPreview();
    } else {
      updateContext({ newVersionPreview: null, isNewVersionPanelOpen: false });
    }
  };
  const { user } = useAuth();
  const { uploadNewVersion, isUploading } = useDocumentNewVersion();
  const [changeReason, setChangeReason] = useState('');

  const preview = context.newVersionPreview;
  const isOpen = context.isNewVersionPanelOpen;

  if (!isOpen || !preview) return null;

  const { file, document } = preview;
  const createdBy = (user as any)?.email ?? (user as any)?.id ?? '';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!createdBy) {
      const err = 'Пользователь не авторизован';
      alert(err);
      onUploadError?.(err);
      return;
    }

    const result = await uploadNewVersion(document, file, {
      createdBy,
      changeReason: changeReason.trim() || undefined,
      resetStatusToDraft: true,
    });

    if (result.success && result.document) {
      clearPanel();
      updateContext({ selectedDocument: result.document });
      onUploadSuccess?.();
      alert('Новая версия успешно загружена');
    } else {
      const err = result.error || 'Неизвестная ошибка';
      alert(`Ошибка: ${err}`);
      onUploadError?.(err);
    }
  };

  const handleCancel = () => {
    clearPanel();
  };

  return (
    <div className="file-preview-overlay">
      <div className="file-preview-panel">
        <div className="preview-header">
          <h3>Новая версия документа</h3>
          <button className="close-button" onClick={handleCancel} disabled={isUploading}>
            <FiX />
          </button>
        </div>

        <div className="preview-content">
          <div className="file-icon-large">📄</div>

          <div className="file-info">
            <div className="info-row">
              <span className="info-label">Документ:</span>
              <span className="info-value">{document.document_name || document.file_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Текущая версия:</span>
              <span className="info-value">{document.document_number}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Файл:</span>
              <span className="info-value">{file.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Размер:</span>
              <span className="info-value">{formatFileSize(file.size)}</span>
            </div>
          </div>

          <div className="name-edit-section">
            <label>Причина изменения (необязательно):</label>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Например: Исправление опечаток"
              className="name-input"
              style={{ marginTop: 8 }}
            />
          </div>
        </div>

        <div className="preview-footer">
          <button className="cancel-button" onClick={handleCancel} disabled={isUploading}>
            Отмена
          </button>
          <button
            className="upload-button"
            onClick={handleUpload}
            disabled={isUploading}
          >
            <FiUpload /> {isUploading ? 'Загрузка...' : 'Загрузить новую версию'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewVersionUploadPanel;
