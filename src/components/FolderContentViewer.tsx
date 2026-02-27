// // components/FolderContentViewer.tsx
// import { MainContext } from "@/wrappers/MainContext";
// import { useContext, useEffect, useState, useRef, useCallback } from "react";
// import { Document, DocumentAction } from "@/types/document";
// import FilePreviewPanel from "./FilePreviewPanel";
// import NewVersionUploadPanel from "./NewVersionUploadPanel";
// import "../styles/FolderContentViewer.css";
// import DocumentStatusIndicator from "./DocumentStatusIndicator";
// import { FileIcon } from 'react-file-icon';
// import SubmitToReviewPanel from "./SubmitToReviewPanel";
// import DocumentReviewPanel from "./DocumentReviewPanel";
// import DocumentContextMenu from './DocumentContextMenu';
// import DeleteDocumentPanel from "./DeleteDocumentPanel";
// import ArchiveDocumentPanel from "./ArchiveDocumentPanel";

// interface FolderContentViewerProps {
//   onDocumentSelect?: (document: Document) => void;
//   onDocumentPreview?: (document: Document) => void;
// }

// interface DocumentFilters {
//     study_id: number;
//     site_id: string | number;
//     folder_id: string;
// }

// interface DocumentsInFolder {
//     count: number;
//     documents: Document[];
//     filters: DocumentFilters;
// }

// const FolderContentViewer: React.FC<FolderContentViewerProps> = ({ onDocumentSelect, onDocumentPreview }) => {

//   const { context, updateContext } = useContext(MainContext)!;
//   const { currentStudy, currentSite, docWasDeleted, selectedFolder, selectedDocument } = context;
  
//   const [documentsData, setDocumentsData] = useState<DocumentsInFolder | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);
//   const [uploadSuccess, setUploadSuccess] = useState(false);

//   // Ref для контейнера с документами
//   const contentRef = useRef<HTMLDivElement>(null);
//   const folderRef = useRef<HTMLDivElement>(null);
//   const folderHeaderRef = useRef<HTMLDivElement>(null);
//   const docHeaderRef = useRef<HTMLDivElement>(null);
//   const documentListRef = useRef<HTMLDivElement>(null);

//   // Функция загрузки документов
//   const loadFolderContents = useCallback(async () => {
//     if (!selectedFolder || !currentStudy || !currentSite) {
//       setDocumentsData(null);
//       return;
//     }

//     setIsLoading(true);
//     setError(null);

//     try {
//       const response = await fetch(
//         `/api/documents?study_id=${currentStudy.id}&site_id=${currentSite.id}&folder_id=${selectedFolder.id}`
//       );
      
//       if (!response.ok) {
//         throw new Error('Failed to load documents');
//       }

//       const data: DocumentsInFolder = await response.json();
//       setDocumentsData(data);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Error loading documents');
//       console.error('Error loading folder contents:', err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [selectedFolder, currentStudy, currentSite]);

//     // Загрузка документов при выборе папки
//   useEffect(() => {
//     loadFolderContents();
//   }, [loadFolderContents]);

//   // Перезагрузка при успешной загрузке документа или удалении документа
//   useEffect(() => {
//     if (uploadSuccess || docWasDeleted) {
//       loadFolderContents();
//       setUploadSuccess(false);
//       updateContext({docWasDeleted: false});
//     }
//   }, [uploadSuccess, loadFolderContents, docWasDeleted]);
  
//   // Обработчик успешной загрузки
//   const handleUploadSuccess = () => {
//     setUploadSuccess(true);
//   };

//   // Обработчик ошибки загрузки
//   const handleUploadError = (error: string) => {
//     console.error('Upload error:', error);
//     // Здесь можно добавить логирование или показ уведомления
//   };
  
//   // Обработчик клика вне документа
//   const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {

//     const target = e.target as Node;

//     // Проверяем, попал ли клик внутрь docHeaderRef или других служебных областей
//     const clickedOnHeader = docHeaderRef.current?.contains(target);
//     const clickedOnFolderInfo = folderHeaderRef.current?.contains(target);
//     const clickedOnEmptySpace = target === contentRef.current || target === folderRef.current || target === documentListRef.current;

//     // Проверяем, что клик был именно по контейнеру, а не по его дочерним элементам
//     if (clickedOnHeader || clickedOnFolderInfo || clickedOnEmptySpace) {
//       // Удаляем документ из контекста - это сбрасывает выделение
//       updateContext({ selectedDocument: null });
//       onDocumentSelect?.(null as any); // Передаем null, если нужно уведомить родителя
//     }
//   };

//   // Обработчик клика по документу
//   const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>, doc: Document) => {
//     e.stopPropagation(); // Предотвращаем всплытие до контейнера
//     updateContext({ selectedDocument: doc });
//     onDocumentSelect?.(doc);
//   };

//   // Обработчик двойного клика по документу
//   const handleDocumentDoubleClick = (e: React.MouseEvent<HTMLDivElement>, doc: Document) => {
//     e.stopPropagation(); // Предотвращаем всплытие до контейнера
//     onDocumentPreview?.(doc);
//   };

//   // Обработчик контекстного меню
//   const handleContextMenuAction = (action: DocumentAction, doc: Document) => {

//     switch (action) {
//         case DocumentAction.VIEW:
//           updateContext({ isRightFrameOpen: true });
//           break;
//         case DocumentAction.SUBMIT_FOR_REVIEW:
//           updateContext({ isSubmittingToReview: true });
//           break;
//         case DocumentAction.APPROVE:
//         case DocumentAction.REJECT:
//           updateContext({ isAcceptedForReview: true });
//           break;
//         case DocumentAction.DOWNLOAD:
//           // Логика скачивания
//           break;
//         case DocumentAction.SOFT_DELETE:
//           // В идеале вызвать метод из хука useDocumentDelete здесь 
//           // или просто открыть модалку подтверждения через контекст
//           break;
//         default:
//           console.log('Action not implemented in context menu:', action);
//       }
//   };

//   // Функция для получения цвета статуса
//   const getStatusColor = (status: Document['status']): string => {
//     const statusColors: Record<Document['status'], string> = {
//       'draft': '#666',
//       'in_review': '#f39c12',
//       'approved': '#27ae60',
//       'archived': '#7f8c8d',
//       'deleted': '#c0392b'
//     };
//     return statusColors[status] || '#666';
//   };


//   // Oбработчик для обновления после ревью
//   const handleReviewComplete = () => {
//     // Обновляем список документов после утверждения/отклонения
//     setUploadSuccess(true);
//   };

//   // Форматирование даты
//   const formatDate = (dateString: string): string => {
//     return new Date(dateString).toLocaleDateString('ru-RU', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   // Если папка не выбрана
//   if (!selectedFolder) {
//     return (
//       <div className="folder-content-viewer empty-state">
//         <div className="empty-state-icon">📁</div>
//       </div>
//     );
//   }

//   // Загрузка
//   if (isLoading) {
//     return (
//       <div className="folder-content-viewer loading-state">
//         <div className="spinner"></div>
//         <div>Загрузка содержимого...</div>
//       </div>
//     );
//   }

//   // Ошибка
//   if (error) {
//     return (
//       <div className="folder-content-viewer error-state">
//         <div className="error-icon">⚠️</div>
//         <div className="error-text">{error}</div>
//       </div>
//     );
//   }


//   const documents = documentsData?.documents || [];
//   const documentsCount = documentsData?.count || 0;
  
//   console.log('documentsData: ', documentsData)
  
//   return (
//     <div 
//       className="folder-content-viewer" 
//       ref={contentRef}
//       onClick={handleContentClick}
//     >
//       {/* Заголовок с информацией о папке */}
//       <div className="folder-header" ref={folderHeaderRef}>
//         <div className="folder-info">
//           <span className="folder-icon">📂</span>
//           <span className="folder-name">{selectedFolder.name}</span>
//           <span className="document-count">
//             {documentsCount} {getDocumentCountText(documentsCount)}
//           </span>
//         </div>
//         {selectedDocument?.status && (
//           <div className="folder-filters">
//             <DocumentStatusIndicator
//               size="medium" 
//               showLabel
//               status={selectedDocument?.status}
//             />
//           </div>
//         )}
//       </div>
  
//       {/* Содержимое папки */}
//       {documents.length === 0 ? (
//         <div className="empty-folder">
//           <div className="empty-folder-icon">📭</div>
//           <div className="empty-folder-text">Папка пуста</div>
//           <div className="empty-folder-hint">В этой папке пока нет документов</div>
//         </div>
//       ) : (
//         <div className="table-container">
//           <div className="documents-header" ref={docHeaderRef} onContextMenu={(e) => (e.preventDefault())}>
//             <div className="col-name">Имя документа</div>
//             <div className="col-status">Статус</div>
//             <div className="col-version">Версия</div>
//             <div className="col-created">Создан</div>
//           </div>
          
//           <div className="documents-list" ref={documentListRef} onContextMenu={(e) => (e.preventDefault())}>
//             {documents.map((doc) => (
//               <DocumentContextMenu
//                 document={doc}
//                 key={doc.id}
//                 onAction={(e) => handleContextMenuAction(e, doc)}
//               >              
//               <div 
//                 key={doc.id} 
//                 className={`document-row ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
//                 onClick={(e) => handleDocumentClick(e, doc)}
//                 onDoubleClick={(e) => handleDocumentDoubleClick(e, doc)}
//               >
//                 <div className="col-name">
//                   <span className="doc-icon">
//                     {doc.file_type?.includes('pdf') ? (
//                       <FileIcon extension="pdf" labelColor="#D93831" type="acrobat" />
//                     ) : (
//                       <FileIcon extension="txt" type="document" />
//                     )}
//                   </span>
//                   <span className="doc-name" title={doc.document_name}>
//                     {doc.document_name || 'Без названия'}
//                   </span>
//                   {doc.tmf_artifact && (
//                     <span className="artifact-tag" title={doc.tmf_artifact}>
//                       {doc.tmf_artifact}
//                     </span>
//                   )}
//                 </div>
                
//                 <div className="col-status">
//                   <span 
//                     className={`status-badge ${doc.is_deleted ? 'deleted' : ''}`}
//                     style={{ 
//                       backgroundColor: (doc.is_deleted ? '#c0392b' : getStatusColor(doc.status)) + '20', 
//                       color: doc.is_deleted ? '#c0392b' : getStatusColor(doc.status) 
//                     }}
//                   >
//                     <span className="status-text">
//                       {doc.is_deleted ? 'deleted' : doc.status}
//                     </span>
//                   </span>
//                 </div>
  
//                 <div className="col-version">
//                   {doc.document_number}
//                 </div>
  
//                 <div className="col-created">
//                   {formatDate(doc.created_at)}
//                 </div>
//               </div>
//               </DocumentContextMenu>
//             ))}
//           </div>
//         </div>
//       )}
  
//       {/* Панель предпросмотра файла */}
//       <FilePreviewPanel
//         onUploadSuccess={handleUploadSuccess}
//         onUploadError={handleUploadError}
//       />
      
//       {/* Панель загрузки новой версии */}
//       <NewVersionUploadPanel
//         onUploadSuccess={handleUploadSuccess}
//         onUploadError={handleUploadError}
//       />

//       {/* Панель отправки документа на ревью */}
//       <SubmitToReviewPanel
//         studyId={currentStudy?.id || 0}
//         siteId={currentSite?.id || ''}
//       />

//       {/* Панель ревью документа */}
//       <DocumentReviewPanel
//         onReviewComplete={handleReviewComplete}
//       />

//       {/* Панель удаления документа (soft deletes) */}
//       <DeleteDocumentPanel />

//       {/* Панель архивации документа */}
//       <ArchiveDocumentPanel />

//     </div>
//   );
// };

// // Вспомогательная функция для склонения слова "документ"
// const getDocumentCountText = (count: number): string => {
//   if (count === 0) return 'документов';
  
//   const lastDigit = count % 10;
//   const lastTwoDigits = count % 100;
  
//   if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
//     return 'документов';
//   }
  
//   if (lastDigit === 1) {
//     return 'документ';
//   }
  
//   if (lastDigit >= 2 && lastDigit <= 4) {
//     return 'документа';
//   }
  
//   return 'документов';
// };

// export default FolderContentViewer;

// components/FolderContentViewer.tsx
import { MainContext } from "@/wrappers/MainContext";
import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Document, DocumentAction } from "@/types/document";
import FilePreviewPanel from "./FilePreviewPanel";
import NewVersionUploadPanel from "./NewVersionUploadPanel";
import "../styles/FolderContentViewer.css";
import DocumentStatusIndicator from "./DocumentStatusIndicator";
import { FileIcon } from 'react-file-icon';
import SubmitToReviewPanel from "./SubmitToReviewPanel";
import DocumentReviewPanel from "./DocumentReviewPanel";
import DocumentContextMenu from './DocumentContextMenu';
import DeleteDocumentPanel from "./DeleteDocumentPanel";
import ArchiveDocumentPanel from "./ArchiveDocumentPanel";

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

// Типы фильтров
type ViewFilter = 'all' | 'active' | 'deleted' | 'archived';

const FolderContentViewer: React.FC<FolderContentViewerProps> = ({ onDocumentSelect, onDocumentPreview }) => {

  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, docWasDeleted, selectedFolder, selectedDocument } = context;
  
  const [documentsData, setDocumentsData] = useState<DocumentsInFolder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Состояние для фильтров
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('active');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Ref для контейнера с документами
  const contentRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const folderHeaderRef = useRef<HTMLDivElement>(null);
  const docHeaderRef = useRef<HTMLDivElement>(null);
  const documentListRef = useRef<HTMLDivElement>(null);

  // Функция загрузки документов - всегда загружаем все
  const loadFolderContents = useCallback(async () => {
    if (!selectedFolder || !currentStudy || !currentSite) {
      setDocumentsData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Всегда запрашиваем include_deleted=true и include_archived=true
      const response = await fetch(
        `/api/documents?study_id=${currentStudy.id}&site_id=${currentSite.id}&folder_id=${selectedFolder.id}&include_deleted=true&include_archived=true`
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
  }, [uploadSuccess, loadFolderContents, docWasDeleted, updateContext]);

  // Фильтрация документов на фронтенде
  const filteredDocuments = useMemo(() => {
    if (!documentsData?.documents) return [];
    
    const allDocs = documentsData.documents;
    
    switch (activeFilter) {
      case 'active':
        // Только активные (не удаленные и не архивированные)
        return allDocs.filter(doc => !doc.is_deleted && !doc.is_archived);
      
      case 'deleted':
        // Только удаленные
        return allDocs.filter(doc => doc.is_deleted);
      
      case 'archived':
        // Только архивированные (не удаленные)
        return allDocs.filter(doc => doc.is_archived && !doc.is_deleted);
      
      case 'all':
      default:
        // Все документы
        return allDocs;
    }
  }, [documentsData, activeFilter]);

  // Количество документов по категориям
  const documentCounts = useMemo(() => {
    if (!documentsData?.documents) {
      return { active: 0, deleted: 0, archived: 0, all: 0 };
    }
    
    const allDocs = documentsData.documents;
    
    return {
      active: allDocs.filter(doc => !doc.is_deleted && !doc.is_archived).length,
      deleted: allDocs.filter(doc => doc.is_deleted).length,
      archived: allDocs.filter(doc => doc.is_archived && !doc.is_deleted).length,
      all: allDocs.length
    };
  }, [documentsData]);

  // Закрытие меню фильтров при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Обработчик контекстного меню
  const handleContextMenuAction = (action: DocumentAction, doc: Document) => {

    switch (action) {
        case DocumentAction.VIEW:
          updateContext({ isRightFrameOpen: true });
          break;
        case DocumentAction.SUBMIT_FOR_REVIEW:
          updateContext({ isSubmittingToReview: true });
          break;
        case DocumentAction.APPROVE:
        case DocumentAction.REJECT:
          updateContext({ isAcceptedForReview: true });
          break;
        case DocumentAction.DOWNLOAD:
          // Логика скачивания
          break;
        case DocumentAction.SOFT_DELETE:
          // В идеале вызвать метод из хука useDocumentDelete здесь 
          // или просто открыть модалку подтверждения через контекст
          break;
        default:
          console.log('Action not implemented in context menu:', action);
      }
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

  // Получение отображаемого статуса для документа
  const getDisplayStatus = (doc: Document): string => {
    if (doc.is_deleted) return 'deleted';
    if (doc.is_archived) return 'archived';
    return doc.status || 'draft';
  };

  // Обработчик для обновления после ревью
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

  const documents = filteredDocuments;
  const documentsCount = documents.length;
  const totalCount = documentsData?.count || 0;
  
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
            {documentsCount} / {totalCount} {getDocumentCountText(totalCount)}
          </span>
          
          {/* Фильтр документов */}
          <div className="document-filter" ref={filterMenuRef}>
            <button 
              className="filter-button"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <span>Фильтр: {
                activeFilter === 'all' ? 'Все' :
                activeFilter === 'active' ? 'Активные' :
                activeFilter === 'deleted' ? 'Удаленные' : 'Архивированные'
              }</span>
              <span className="filter-arrow">▼</span>
            </button>
            
            {showFilterMenu && (
              <div className="filter-menu">
                <div 
                  className={`filter-item ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFilter('all');
                    setShowFilterMenu(false);
                  }}
                >
                  <span>Все документы</span>
                  <span className="filter-count">{documentCounts.all}</span>
                </div>
                <div 
                  className={`filter-item ${activeFilter === 'active' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFilter('active');
                    setShowFilterMenu(false);
                  }}
                >
                  <span>Активные</span>
                  <span className="filter-count">{documentCounts.active}</span>
                </div>
                <div 
                  className={`filter-item ${activeFilter === 'deleted' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFilter('deleted');
                    setShowFilterMenu(false);
                  }}
                >
                  <span>Удаленные</span>
                  <span className="filter-count">{documentCounts.deleted}</span>
                </div>
                <div 
                  className={`filter-item ${activeFilter === 'archived' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFilter('archived');
                    setShowFilterMenu(false);
                  }}
                >
                  <span>Архивированные</span>
                  <span className="filter-count">{documentCounts.archived}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* {selectedDocument?.status && (
          <div className="folder-filters">
            <DocumentStatusIndicator
              size="medium" 
              showLabel
              status={selectedDocument?.status}
            />
          </div>
        )} */}
      </div>
  
      {/* Содержимое папки */}
      {documents.length === 0 ? (
        <div className="empty-folder">
          <div className="empty-folder-icon">📭</div>
          <div className="empty-folder-text">
            {activeFilter === 'all' && 'Папка пуста'}
            {activeFilter === 'active' && 'Нет активных документов'}
            {activeFilter === 'deleted' && 'Нет удаленных документов'}
            {activeFilter === 'archived' && 'Нет архивированных документов'}
          </div>
          <div className="empty-folder-hint">
            {activeFilter === 'active' && 'В этой папке пока нет активных документов'}
            {activeFilter === 'deleted' && 'В этой папке нет удаленных документов'}
            {activeFilter === 'archived' && 'В этой папке нет архивированных документов'}
            {activeFilter === 'all' && 'В этой папке пока нет документов'}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <div className="documents-header" ref={docHeaderRef} onContextMenu={(e) => (e.preventDefault())}>
            <div className="col-name">Имя документа</div>
            <div className="col-status">Статус</div>
            <div className="col-version">Версия</div>
            <div className="col-created">Создан</div>
          </div>
          
          <div className="documents-list" ref={documentListRef} onContextMenu={(e) => (e.preventDefault())}>
            {documents.map((doc) => {
              const displayStatus = getDisplayStatus(doc);
              return (
                <DocumentContextMenu
                  document={doc}
                  key={doc.id}
                  onAction={(e) => handleContextMenuAction(e, doc)}
                >              
                <div 
                  key={doc.id} 
                  className={`document-row ${selectedDocument?.id === doc.id ? 'selected' : ''} ${doc.is_deleted ? 'deleted' : ''} ${doc.is_archived ? 'archived' : ''}`}
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
                      {doc.is_deleted && <span className="status-badge-small deleted">(удален)</span>}
                      {doc.is_archived && !doc.is_deleted && <span className="status-badge-small archived">(архивирован)</span>}
                    </span>
                    {doc.tmf_artifact && (
                      <span className="artifact-tag" title={doc.tmf_artifact}>
                        {doc.tmf_artifact}
                      </span>
                    )}
                  </div>
                  
                  <div className="col-status">
                    <span 
                      className={`status-badge ${displayStatus}`}
                      style={{ 
                        backgroundColor: (
                          displayStatus === 'deleted' ? '#c0392b' :
                          displayStatus === 'archived' ? '#7f8c8d' :
                          getStatusColor(displayStatus as any)
                        ) + '20', 
                        color: (
                          displayStatus === 'deleted' ? '#c0392b' :
                          displayStatus === 'archived' ? '#7f8c8d' :
                          getStatusColor(displayStatus as any)
                        )
                      }}
                    >
                      <span className="status-text">{displayStatus}</span>
                    </span>
                  </div>
    
                  <div className="col-version">
                    {doc.document_number || '1'}
                  </div>
    
                  <div className="col-created">
                    {formatDate(doc.created_at)}
                  </div>
                </div>
                </DocumentContextMenu>
              );
            })}
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

      {/* Панель удаления документа (soft deletes) */}
      <DeleteDocumentPanel />

      {/* Панель архивации документа */}
      <ArchiveDocumentPanel />

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