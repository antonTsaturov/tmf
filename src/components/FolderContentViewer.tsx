import { AdminContext } from "@/wrappers/AdminContext";
import { MainContext } from "@/wrappers/MainContext";
import { useContext, useEffect, useState } from "react";
import { Document } from "@/types/document";
import "../styles/FolderContentViewer.css";

interface FolderContentViewerProps {
  onDocumentSelect?: (document: Document) => void;
  onDocumentPreview?: (document: Document) => void;
}

interface DocumentFilters {
    study_id: number;
    site_id: string | number; // site_id может быть строкой или числом
    folder_id: string;
}

interface DocumentsInFolder {
    count: number;
    documents: Document[];
    filters: DocumentFilters;
}

const FolderContentViewer: React.FC<FolderContentViewerProps> = ({
  onDocumentSelect,
  onDocumentPreview
}) => {
  const { studies, currentStudyID, currentSiteID } = useContext(AdminContext)!;
  const { context } = useContext(MainContext)!;
  
  const [documentsData, setDocumentsData] = useState<DocumentsInFolder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFolder = context.selectedFolder;

  // Загрузка документов при выборе папки
  useEffect(() => {

    console.log('selectedFolder || !currentStudyID || !currentSiteID ', selectedFolder, currentStudyID, currentSiteID)
    const loadFolderContents = async () => {
      if (!selectedFolder || !currentStudyID || !currentSiteID) {
        setDocumentsData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/document?study_id=${currentStudyID}&site_id=${currentSiteID}&folder_id=${selectedFolder.id}`
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
    };

    loadFolderContents();
  }, [selectedFolder, currentStudyID, currentSiteID]);

  // Функция для получения иконки в зависимости от статуса документа
  const getStatusIcon = (status: Document['status']): string => {
    const statusIcons: Record<Document['status'], string> = {
      'draft': '📝',
      'on review': '👀',
      'approved': '✅',
      'rejected': '❌',
      'archived': '📦',
      'deleted': '🗑️'
    };
    return statusIcons[status] || '📄';
  };

  // Функция для получения цвета статуса
  const getStatusColor = (status: Document['status']): string => {
    const statusColors: Record<Document['status'], string> = {
      'draft': '#666',
      'on review': '#f39c12',
      'approved': '#27ae60',
      'rejected': '#e74c3c',
      'archived': '#7f8c8d',
      'deleted': '#c0392b'
    };
    return statusColors[status] || '#666';
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
        {/* <div className="empty-state-text">Выберите папку для просмотра содержимого</div> */}
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
    <div className="folder-content-viewer">
      {/* Заголовок с информацией о папке */}
      <div className="folder-header">
        <div className="folder-info">
          <span className="folder-icon">📂</span>
          <span className="folder-name">{selectedFolder.name}</span>
          <span className="document-count">
            {documentsCount} {getDocumentCountText(documentsCount)}
          </span>
        </div>
        {documentsData?.filters && (
          <div className="folder-filters">
            <span className="filter-badge">Study ID: {documentsData.filters.study_id}</span>
            <span className="filter-badge">Site ID: {documentsData.filters.site_id}</span>
          </div>
        )}
      </div>

      {/* Содержимое папки */}
      <div className="folder-content">
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
              <div className="col-modified">Изменен</div>
              <div className="col-created">Создан</div>
            </div>
            
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="document-row"
                onClick={() => onDocumentSelect?.(doc)}
                onDoubleClick={() => onDocumentPreview?.(doc)}
              >
                <div className="col-name">
                  <span className="doc-icon">📄</span>
                  <span className="doc-name" title={doc.folder_name}>
                    {doc.folder_name || 'Без названия'}
                  </span>
                  {doc.tmf_artifact && (
                    <span className="artifact-tag" title={doc.tmf_artifact}>
                      {doc.tmf_artifact}
                    </span>
                  )}
                </div>
                
                <div className="col-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(doc.status) + '20', color: getStatusColor(doc.status) }}
                  >
                    <span className="status-icon">{getStatusIcon(doc.status)}</span>
                    <span className="status-text">{doc.status}</span>
                  </span>
                </div>

                {/* <div className="col-version">
                  {doc.total_versions ? (
                    <span className="version-badge">
                      v{doc.total_versions}
                      {doc.total_versions > 1 && ` (${doc.total_versions})`}
                    </span>
                  ) : (
                    <span className="version-badge version-new">Новый</span>
                  )}
                </div> */}
                
                {/* <div className="col-modified">
                  {doc.last_uploaded_at ? formatDate(doc.last_uploaded_at) : '-'}
                </div> */}
                
                <div className="col-created">
                  {formatDate(doc.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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