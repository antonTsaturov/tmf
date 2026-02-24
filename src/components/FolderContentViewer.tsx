// components/FolderContentViewer.tsx
import { MainContext } from "@/wrappers/MainContext";
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { Document } from "@/types/document";
import FilePreviewPanel from "./FilePreviewPanel";
import NewVersionUploadPanel from "./NewVersionUploadPanel";
import "../styles/FolderContentViewer.css";
import DocumentStatusIndicator from "./DocumentStatusIndicator";
import { FileIcon } from 'react-file-icon';
import SubmitToReviewPanel from "./SubmitToReviewPanel";
import DocumentReviewPanel from "./DocumentReviewPanel";

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
  const folderHeaderRef = useRef<HTMLDivElement>(null);
  const docHeaderRef = useRef<HTMLDivElement>(null);
  const documentListRef = useRef<HTMLDivElement>(null);

  // Функция для поиска родительской папки
  // const findParentFolder = useCallback((folders: FolderNode[], targetId: string, parent: FolderNode | null = null): FolderNode | null => {
  //   for (const folder of folders) {
  //     if (folder.id === targetId) {
  //       return parent;
  //     }
  //     if (folder.children && folder.children.length > 0) {
  //       const found = findParentFolder(folder.children, targetId, folder);
  //       if (found) return found;
  //     }
  //   }
  //   return null;
  // }, []);

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

  console.log('documentsData: ', documentsData)

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
  
  // Обработчик клика вне документа
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {

    const target = e.target as Node;

    // Проверяем, попал ли клик внутрь docHeaderRef или других служебных областей
    const clickedOnHeader = docHeaderRef.current?.contains(target);
    const clickedOnFolderInfo = folderHeaderRef.current?.contains(target);
    const clickedOnEmptySpace = target === contentRef.current || target === folderRef.current || target === documentListRef.current;

    // Проверяем, что клик был именно по контейнеру, а не по его дочерним элементам
    if (clickedOnHeader || clickedOnFolderInfo || clickedOnEmptySpace) {
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


  // Oбработчик для обновления после ревью
  const handleReviewComplete = () => {
    // Обновляем список документов после утверждения/отклонения
    setUploadSuccess(true);
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
      <div className="folder-header" ref={folderHeaderRef}>
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
          </div>
        )}
      </div>
  
      {/* Содержимое папки */}
      {documents.length === 0 ? (
        <div className="empty-folder">
          <div className="empty-folder-icon">📭</div>
          <div className="empty-folder-text">Папка пуста</div>
          <div className="empty-folder-hint">В этой папке пока нет документов</div>
        </div>
      ) : (
        <div className="table-container">
          <div className="documents-header" ref={docHeaderRef}>
            <div className="col-name">Имя документа</div>
            <div className="col-status">Статус</div>
            <div className="col-version">Версия</div>
            <div className="col-created">Создан</div>
          </div>
          
          <div className="documents-list" ref={documentListRef}>
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className={`document-row ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
                onClick={(e) => handleDocumentClick(e, doc)}
                onDoubleClick={(e) => handleDocumentDoubleClick(e, doc)}
              >
                <div className="col-name">
                  <span className="doc-icon">
                    {doc.file_type?.includes('pdf') ? (
                      <FileIcon extension="pdf" labelColor="#D93831" type="acrobat" />
                    ) : (
                      <FileIcon extension="txt" type="document" />
                    )}
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
                      backgroundColor: (doc.is_deleted ? '#c0392b' : getStatusColor(doc.status)) + '20', 
                      color: doc.is_deleted ? '#c0392b' : getStatusColor(doc.status) 
                    }}
                  >
                    <span className="status-text">
                      {doc.is_deleted ? 'deleted' : doc.status}
                    </span>
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
        </div>
      )}
  
      {/* Панель предпросмотра файла */}
      <FilePreviewPanel
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
      
      {/* Панель загрузки новой версии */}
      <NewVersionUploadPanel
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />

      {/* Панель отправки документа на ревью */}
      <SubmitToReviewPanel
        studyId={currentStudy?.id || 0}
        siteId={currentSite?.id || ''}
      />

      {/* Панель ревью документа */}
      <DocumentReviewPanel
        onReviewComplete={handleReviewComplete}
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