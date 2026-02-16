// components/FilePreviewPanel.tsx
import React, { useContext, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { FiX, FiUpload, FiEdit2 } from 'react-icons/fi';
import '../styles/FilePreviewPanel.css';

const FilePreviewPanel: React.FC = () => {
  const { context, clearFilePreview, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, currentLevel, selectedFolder } = context;

  const { uploadFile, isUploading } = useDocumentUpload();
  const [isEditing, setIsEditing] = useState(false);
  const [customName, setCustomName] = useState('');

  const preview = context.filePreview;
  const isOpen = context.isPreviewOpen;

  if (!isOpen || !preview) return null;

  // Форматирование размера файла
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Получить иконку для типа файла
  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📕';
      case 'txt':
        return '📄';
      default:
        return '📄';
    }
  };

  // const handleUpload = async () => {
  //   try {
  //     const result = await uploadFile(preview.file, {
  //       studyId: preview.studyId,
  //       siteId: preview.siteId,
  //       folderId: preview.folderId,
  //       folderName: preview.folderName,
  //       createdBy: preview.createdBy,
  //       tmfZone: null,
  //       tmfArtifact: null
  //     });

  //     if (result.success && result.document) {
  //       // Очищаем превью
  //       clearFilePreview();
        
  //       // Обновляем выбранный документ
  //       updateContext({ selectedDocument: result.document });
        
  //       // Можно показать уведомление об успехе
  //       alert('Документ успешно загружен');
  //     } else {
  //       alert(`Ошибка при загрузке: ${result.error}`);
  //     }
  //   } catch (error) {
  //     alert(`Ошибка при загрузке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  //   }
  // };

  const handleUpload = async () => {
    try {

      if (!currentStudy?.id || !currentSite?.id) {
        alert('Ошибка: не указаны исследование или центр');
        return;
      }

      const result = await uploadFile(preview.file, {
        studyId: currentStudy?.id,
        siteId: currentSite?.id,
        folderId: preview.folderId,
        folderName: preview.folderName,
        createdBy: preview.createdBy,
        tmfZone: null,
        tmfArtifact: null,
        customFileName: preview.customName !== preview.file.name ? preview.customName : undefined
      });

      if (result.success && result.document) {
        clearFilePreview();
        updateContext({ selectedDocument: result.document });
        alert('Документ успешно загружен');
      } else {
        alert(`Ошибка при загрузке: ${result.error}`);
      }
    } catch (error) {
      alert(`Ошибка при загрузке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };  

  const handleCancel = () => {
    clearFilePreview();
  };

  const startEditing = () => {
    setCustomName(preview.customName);
    setIsEditing(true);
  };

  const saveName = () => {
    if (customName.trim()) {
      preview.customName = customName.trim();
    }
    setIsEditing(false);
  };

  // Вспомогательные функции для безопасного отображения значений
  const getSiteDisplay = (): string => {
    // if (preview.siteId) {
    //   return String(preview.siteId);
    // }
    if (currentSite?.name) {
      return currentSite.name ;
    }
    return 'Не указан';
  };

  const getStudyDisplay = (): string => {
    if (currentStudy?.protocol) {
      return currentStudy.protocol;
    }
    if (currentStudy?.title) {
      return currentStudy.title;
    }
    return 'Не указано';
  };

  return (
    <div className="file-preview-overlay">
      <div className="file-preview-panel">
        <div className="preview-header">
          <h3>Предпросмотр документа</h3>
          <button className="close-button" onClick={handleCancel} disabled={isUploading}>
            <FiX />
          </button>
        </div>

        <div className="preview-content">
          {/* Иконка файла */}
          <div className="file-icon-large">
            {getFileIcon(preview.file.name)}
          </div>

          {/* Информация о файле */}
          <div className="file-info">
            <div className="info-row">
              <span className="info-label">Исходное имя:</span>
              <span className="info-value">{preview.file.name}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Тип:</span>
              <span className="info-value">{preview.file.type || 'Неизвестно'}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Размер:</span>
              <span className="info-value">{formatFileSize(preview.size)}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Папка:</span>
              <span className="info-value">{preview.folderName}</span>
            </div>

            <div className="info-row">
              <span className="info-label">Центр:</span>
              <span className="info-value">{getSiteDisplay()}</span>
            </div>

            <div className="info-row">
              <span className="info-label">Исследование:</span>
              <span className="info-value">{getStudyDisplay()}</span>
            </div>
          </div>

          {/* Редактирование имени */}
          <div className="name-edit-section">
            <label>Название документа:</label>
            {isEditing ? (
              <div className="edit-controls">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Введите название документа"
                  autoFocus
                  className="name-input"
                />
                <button onClick={saveName} className="save-button">Сохранить</button>
              </div>
            ) : (
              <div className="name-display">
                <span className="display-name">{preview.customName}</span>
                <button onClick={startEditing} className="edit-button" disabled={isUploading}>
                  <FiEdit2 /> Изменить
                </button>
              </div>
            )}
            <small className="hint">
              *Расширение .{preview.file.name.split('.').pop()} будет добавлено автоматически
            </small>
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
            <FiUpload /> {isUploading ? 'Загрузка...' : 'Загрузить документ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewPanel;