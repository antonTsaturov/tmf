// components/FolderContentViewer.tsx
import { MainContext } from "@/wrappers/MainContext";
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { Document } from "@/types/document";
import FilePreviewPanel from "./FilePreviewPanel";
import "../styles/FolderContentViewer.css";
import DocumentStatusIndicator from "./DocumentStatusIndicator";
import { FaRegFilePdf } from "react-icons/fa6";
import { BsFiletypeTxt } from "react-icons/bs";

interface FolderContentViewerProps {
  onDocumentSelect?: (document: Document) => void;
  onDocumentPreview?: (document: Document) => void;
}

interface DocumentFilters {
    study_id: number;
    site_id: string | number;
    folder_id: string;
}

interface DocumentsInFolder {
    count: number;
    documents: Document[];
    filters: DocumentFilters;
}

const FolderContentViewer: React.FC<FolderContentViewerProps> = ({ onDocumentSelect, onDocumentPreview }) => {

  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, docWasDeleted, selectedFolder, selectedDocument } = context;
  
  const [documentsData, setDocumentsData] = useState<DocumentsInFolder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Ref для контейнера с документами
  const contentRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Функция загрузки документов
  const loadFolderContents = useCallback(async () => {
    if (!selectedFolder || !currentStudy || !currentSite) {
      setDocumentsData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/documents?study_id=${currentStudy.id}&site_id=${currentSite.id}&folder_id=${selectedFolder.id}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data: DocumentsInFolder = await response.json();
      setDocumentsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading documents');
      console.error('Error loading folder contents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, currentStudy, currentSite]);

    // Загрузка документов при выборе папки
  useEffect(() => {
    loadFolderContents();
  }, [loadFolderContents]);

  // Перезагрузка при успешной загрузке документа или удалении документа
  useEffect(() => {
    if (uploadSuccess || docWasDeleted) {
      loadFolderContents();
      setUploadSuccess(false);
      updateContext({docWasDeleted: false});
    }
  }, [uploadSuccess, loadFolderContents, docWasDeleted]);
  
  // Обработчик успешной загрузки
  const handleUploadSuccess = () => {
    setUploadSuccess(true);
  };

  // Обработчик ошибки загрузки
  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // Здесь можно добавить логирование или показ уведомления
  };
  
  // Обработчик клика по свободному месту
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Проверяем, что клик был именно по контейнеру, а не по его дочерним элементам
    if (e.target === contentRef.current || e.target === folderRef.current || e.target === headerRef.current) {
      // Удаляем документ из контекста - это сбрасывает выделение
      updateContext({ selectedDocument: null });
      onDocumentSelect?.(null as any); // Передаем null, если нужно уведомить родителя
    }
  };

  // Обработчик клика по документу
  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>, doc: Document) => {
    e.stopPropagation(); // Предотвращаем всплытие до контейнера
    updateContext({ selectedDocument: doc });
    onDocumentSelect?.(doc);
  };

  // Обработчик двойного клика по документу
  const handleDocumentDoubleClick = (e: React.MouseEvent<HTMLDivElement>, doc: Document) => {
    e.stopPropagation(); // Предотвращаем всплытие до контейнера
    onDocumentPreview?.(doc);
  };

  // Функция для получения иконки в зависимости от статуса документа
  const getStatusIcon = (status: Document['status']): string => {
    const statusIcons: Record<Document['status'], string> = {
      'draft': '📝',
      'in_review': '👀',
      'approved': '✅',
      'archived': '📦',
      'deleted': '🗑️'
    };
    return statusIcons[status] || '📄';
  };

  // Функция для получения цвета статуса
  const getStatusColor = (status: Document['status']): string => {
    const statusColors: Record<Document['status'], string> = {
      'draft': '#666',
      'in_review': '#f39c12',
      'approved': '#27ae60',
      'archived': '#7f8c8d',
      'deleted': '#c0392b'
    };
    return statusColors[status] || '#666';
  };

  const getDocumentStatusDisplay = (doc: Document): { text: string; icon: string; color: string } => {
    if (doc.is_deleted) {
      return {
        text: 'Удален',
        icon: '🗑️',
        color: '#c0392b'
      };
    }
    
    const statusColors: Record<Document['status'], string> = {
      'draft': '#666',
      'in_review': '#f39c12',
      'approved': '#27ae60',
      'archived': '#7f8c8d',
      'deleted': '#c0392b'
    };
    
    const statusIcons: Record<Document['status'], string> = {
      'draft': '📝',
      'in_review': '👀',
      'approved': '✅',
      'archived': '📦',
      'deleted': '🗑️'
    };
    
    return {
      text: doc.is_deleted ? 'deleted' : doc.status,
      icon: doc.is_deleted ? '🗑️' : statusIcons[doc.status],
      color: doc.is_deleted ? '#c0392b' : statusColors[doc.status]
    };
  };

  // Форматирование даты
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Если папка не выбрана
  if (!selectedFolder) {
    return (
      <div className="folder-content-viewer empty-state">
        <div className="empty-state-icon">📁</div>
      </div>
    );
  }

  // Загрузка
  if (isLoading) {
    return (
      <div className="folder-content-viewer loading-state">
        <div className="spinner"></div>
        <div>Загрузка содержимого...</div>
      </div>
    );
  }

  // Ошибка
  if (error) {
    return (
      <div className="folder-content-viewer error-state">
        <div className="error-icon">⚠️</div>
        <div className="error-text">{error}</div>
      </div>
    );
  }


  const documents = documentsData?.documents || [];
  const documentsCount = documentsData?.count || 0;
  
  return (
    <div 
      className="folder-content-viewer" 
      ref={contentRef}
      onClick={handleContentClick}
      >
      {/* Заголовок с информацией о папке */}
      <div className="folder-header" ref={headerRef}>
        <div className="folder-info">
          <span className="folder-icon">📂</span>
          <span className="folder-name">{selectedFolder.name}</span>
          <span className="document-count">
            {documentsCount} {getDocumentCountText(documentsCount)}
          </span>
        </div>
        {selectedDocument?.status && (
          <div className="folder-filters">
            <DocumentStatusIndicator
              size="medium" 
              showLabel
              status={selectedDocument?.status}
            />
            {/* <span className="filter-badge">Study ID: {documentsData.filters.study_id}</span>
            <span className="filter-badge">Site ID: {documentsData.filters.site_id}</span> */}
          </div>
        )}
      </div>

      {/* Содержимое папки */}
      <div className="folder-content" ref={folderRef}>
        {documents.length === 0 ? (
          // Пустая папка
          <div className="empty-folder">
            <div className="empty-folder-icon">📭</div>
            <div className="empty-folder-text">Папка пуста</div>
            <div className="empty-folder-hint">В этой папке пока нет документов</div>
          </div>
        ) : (
          // Список документов
          <div className="documents-list">
            <div className="documents-header">
              <div className="col-name">Имя документа</div>
              <div className="col-status">Статус</div>
              <div className="col-version">Версия</div>
              <div className="col-created">Создан</div>
            </div>
            
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className={`document-row ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                onClick={(e) => handleDocumentClick(e, doc)}
                onDoubleClick={(e) => handleDocumentDoubleClick(e, doc)}
              >
                <div className="col-name">
                  <span className="doc-icon">
                    {doc.file_type.includes('txt')
                      ? <FaRegFilePdf /> 
                      : <BsFiletypeTxt />
                    }
                  </span>
                  <span className="doc-name" title={doc.document_name}>
                    {doc.document_name || 'Без названия'}
                  </span>
                  {doc.tmf_artifact && (
                    <span className="artifact-tag" title={doc.tmf_artifact}>
                      {doc.tmf_artifact}
                    </span>
                  )}
                </div>
                
                <div className="col-status">
                  <span 
                    className={`status-badge ${doc.is_deleted ? 'deleted' : ''}`}
                    style={{ 
                      backgroundColor: (doc.is_deleted ? '#c0392b' : getDocumentStatusDisplay(doc)) + '20', 
                      color: doc.is_deleted ? '#c0392b' : getStatusColor(doc.status) 
                    }}
                  >
                    <span className="status-icon">{doc.is_deleted ? '🗑️' : getStatusIcon(doc.status)}</span>
                    <span className="status-text">{doc.is_deleted ? 'deleted' : doc.status}</span>
                  </span>
                </div>

                <div className="col-version">
                  {doc.document_number}
                </div>

                <div className="col-created">
                  {formatDate(doc.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Панель предпросмотра файла */}
      <FilePreviewPanel
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
    </div>
  );
};

// Вспомогательная функция для склонения слова "документ"
const getDocumentCountText = (count: number): string => {
  if (count === 0) return 'документов';
  
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'документов';
  }
  
  if (lastDigit === 1) {
    return 'документ';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'документа';
  }
  
  return 'документов';
};

export default FolderContentViewer;