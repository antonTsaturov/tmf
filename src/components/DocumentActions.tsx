// // components/DocumentActions.tsx
// import React, { useContext, useState } from 'react';
// import { 
//   FiFilePlus, 
//   FiSend, 
//   FiXCircle, 
//   FiCheckCircle, 
//   FiX, 
//   FiRotateCcw, 
//   FiArchive, 
//   FiRefreshCw, 
//   FiTrash2, 
//   FiDownload, 
//   FiEye,
//   FiUploadCloud
// } from 'react-icons/fi';
// import { MainContext } from '@/wrappers/MainContext';
// import { DocumentAction, DocumentStatus } from '@/types/document';
// import '../styles/DocumentActions.css';
// import { useDocumentUpload } from '@/hooks/useDocumentUpload';
// import { useAuth } from '@/wrappers/AuthProvider';

// interface DocumentActionsProps {
//   onAction: (action: DocumentAction) => void;
//   className?: string;
// }

// // Маппинг действий на иконки и текст
// const actionConfig: Record<DocumentAction, { icon: React.ReactNode; label: string; color?: string }> = {
//   [DocumentAction.CREATE_DOCUMENT]: { 
//     icon: <FiFilePlus />, 
//     label: 'Создать документ',
//     color: '#4CAF50'
//   },
//   [DocumentAction.SUBMIT_FOR_REVIEW]: { 
//     icon: <FiSend />, 
//     label: 'На ревью',
//     color: '#2196F3'
//   },
//   [DocumentAction.CANCEL_REVIEW]: { 
//     icon: <FiXCircle />, 
//     label: 'Отменить ревью',
//     color: '#FF9800'
//   },
//   [DocumentAction.APPROVE]: { 
//     icon: <FiCheckCircle />, 
//     label: 'Утвердить',
//     color: '#4CAF50'
//   },
//   [DocumentAction.REJECT]: { 
//     icon: <FiX />, 
//     label: 'Отклонить',
//     color: '#F44336'
//   },
//   [DocumentAction.RETURN_TO_DRAFT]: { 
//     icon: <FiRotateCcw />, 
//     label: 'В черновик',
//     color: '#9E9E9E'
//   },
//   [DocumentAction.ARCHIVE]: { 
//     icon: <FiArchive />, 
//     label: 'Архивировать',
//     color: '#795548'
//   },
//   [DocumentAction.UNARCHIVE]: { 
//     icon: <FiRefreshCw />, 
//     label: 'Разархивировать',
//     color: '#795548'
//   },
//   [DocumentAction.SOFT_DELETE]: { 
//     icon: <FiTrash2 />, 
//     label: 'Удалить',
//     color: '#F44336'
//   },
//   [DocumentAction.RESTORE]: { 
//     icon: <FiRefreshCw />, 
//     label: 'Восстановить',
//     color: '#4CAF50'
//   },
//   [DocumentAction.UPLOAD_NEW_VERSION]: { 
//     icon: <FiUploadCloud />, 
//     label: 'Новая версия',
//     color: '#2196F3'
//   },
//   [DocumentAction.VIEW]: { 
//     icon: <FiEye />, 
//     label: 'Просмотр',
//     color: '#607D8B'
//   },
//   [DocumentAction.DOWNLOAD]: { 
//     icon: <FiDownload />, 
//     label: 'Скачать',
//     color: '#607D8B'
//   }
// };

// // Маппинг статусов на доступные действия
// const transitions: Record<DocumentStatus, DocumentAction[]> = {
//   draft: [
//     DocumentAction.SUBMIT_FOR_REVIEW,
//     DocumentAction.SOFT_DELETE,
//     DocumentAction.UPLOAD_NEW_VERSION
//   ],
//   'in_review': [
//     DocumentAction.APPROVE,
//     DocumentAction.REJECT,
//     DocumentAction.CANCEL_REVIEW
//   ],
//   approved: [
//     DocumentAction.ARCHIVE
//   ],
//   archived: [
//     DocumentAction.UNARCHIVE
//   ],
//   deleted: [
//     DocumentAction.RESTORE
//   ]
// };

// interface FilePreview {
//   file: File;
//   customName: string;
//   size: number;
// }

// const DocumentActions: React.FC<DocumentActionsProps> = ({onAction, className = ''}) => {
//   const { context, updateContext } = useContext(MainContext)!;
//   const { user } = useAuth();
//   const { uploadFile, isUploading, uploadProgress } = useDocumentUpload();
  
//   // Состояние для модального окна
//   const [isModalOpen, setIsModalOpen] = useState(true);
//   const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
//   const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
//   // Получаем выбранную папку и выбранный документ из контекста
//   const selectedFolder = context.selectedFolder;
//   const selectedDocument = (context as any).selectedDocument;

//   // Определяем доступные действия
//   const getAvailableActions = (): DocumentAction[] => {
//     // Если нет выбранной папки, показываем только создание документа
//     if (!selectedFolder) {
//       return [DocumentAction.CREATE_DOCUMENT];
//     }

//     // Если нет выбранного документа, показываем создание документа
//     if (!selectedDocument) {
//       return [DocumentAction.CREATE_DOCUMENT];
//     }

//     // Получаем действия на основе статуса документа
//     const statusActions = transitions[selectedDocument.status as DocumentStatus] || [];
    
//     // Добавляем общие действия для всех документов
//     const commonActions = [
//       DocumentAction.VIEW,
//       DocumentAction.DOWNLOAD
//     ];

//     // Если документ не удален, добавляем возможность загрузки новой версии
//     if (selectedDocument.status !== 'deleted' && selectedDocument.status !== 'archived') {
//       return [...statusActions, ...commonActions, DocumentAction.UPLOAD_NEW_VERSION];
//     }

//     return [...statusActions, ...commonActions];
//   };

//   const availableActions = getAvailableActions();

//   // Функция для форматирования размера файла
//   const formatFileSize = (bytes: number): string => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   // Обработчик выбора файлов
//   const handleFileSelect = () => {
//     const input = document.createElement('input');
//     input.type = 'file';
//     input.accept = '.pdf,application/pdf,.txt,text/plain';
//     input.multiple = true;
    
//     input.onchange = (e) => {
//       const target = e.target as HTMLInputElement;
//       const files = target.files;
      
//       if (!files || files.length === 0) return;
      
//       // Создаем превью для каждого файла
//       const filePreviews: FilePreview[] = Array.from(files).map(file => ({
//         file,
//         customName: file.name.replace(/\.[^/.]+$/, ''), // Убираем расширение
//         size: file.size
//       }));
      
//       setSelectedFiles(filePreviews);
//       setCurrentFileIndex(0);
//       setIsModalOpen(true);
      
//       // Очищаем input
//       input.remove();
//     };
    
//     input.click();
//   };

//   // Обработчик загрузки текущего файла
//   const handleUploadCurrentFile = async () => {
//     if (!selectedFolder || !user?.id || !context.currentStudy || !context.currentSite) {
//       alert('Не все параметры выбраны');
//       return;
//     }

//     const currentFile = selectedFiles[currentFileIndex];
//     if (!currentFile) return;

//     try {
//       // Загружаем файл
//       const result = await uploadFile(currentFile.file, {
//         studyId: context.currentStudy,
//         siteId: context.currentSite,
//         folderId: selectedFolder.id,
//         folderName: selectedFolder.name,
//         createdBy: user.email,
//         tmfZone: null,
//         tmfArtifact: null
//       });

//       if (result.success && result.document) {
//         // Если это последний файл, закрываем модалку
//         if (currentFileIndex === selectedFiles.length - 1) {
//           setIsModalOpen(false);
//           setSelectedFiles([]);
//           setCurrentFileIndex(0);
          
//           // Обновляем список документов
//           onAction(DocumentAction.CREATE_DOCUMENT);
          
//           // Если загружен один документ, можно его сразу выбрать
//           if (selectedFiles.length === 1) {
//             updateContext({ selectedDocument: result.document });
//           }
//         } else {
//           // Переходим к следующему файлу
//           setCurrentFileIndex(prev => prev + 1);
//         }
//       } else {
//         alert(`Ошибка при загрузке: ${result.error}`);
//       }
//     } catch (error) {
//       alert(`Ошибка при загрузке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
//     }
//   };

//   // Обработчик пропуска файла
//   const handleSkipFile = () => {
//     if (currentFileIndex === selectedFiles.length - 1) {
//       // Если это последний файл, закрываем модалку
//       setIsModalOpen(false);
//       setSelectedFiles([]);
//       setCurrentFileIndex(0);
//     } else {
//       // Переходим к следующему файлу
//       setCurrentFileIndex(prev => prev + 1);
//     }
//   };

//   // Обработчик закрытия модалки
//   const handleCloseModal = () => {
//     setIsModalOpen(false);
//     setSelectedFiles([]);
//     setCurrentFileIndex(0);
//   };

//   // Обработчик изменения имени файла
//   const handleNameChange = (newName: string) => {
//     setSelectedFiles(prev => prev.map((file, index) => 
//       index === currentFileIndex ? { ...file, customName: newName } : file
//     ));
//   };

//   const handleCreateDocument = async () => {
//     if (!selectedFolder) {
//       alert('Сначала выберите папку');
//       return;
//     }

//     if (!user?.id) {
//       alert('Пользователь не авторизован');
//       return;
//     }

//     // Открываем диалог выбора файлов
//     handleFileSelect();
//   };

//   // Обработчик клика по кнопке
//   const handleActionClick = async (action: DocumentAction) => {
//     if (action === DocumentAction.CREATE_DOCUMENT) {
//       await handleCreateDocument();
//       return;
//     }

//     onAction(action);
//   };

//   // Если нет доступных действий, не рендерим компонент
//   if (availableActions.length === 0) {
//     return null;
//   }

//   // Текущий файл для отображения в модалке
//   const currentFile = selectedFiles[currentFileIndex];

//   console.log('currentFile: ', currentFile, isModalOpen)
//   return (
//     <>
//       {/* Индикатор загрузки */}
//       {isUploading && (
//         <div className="upload-progress">
//           {uploadProgress.map((progress, index) => (
//             <div key={index} className="progress-item">
//               <span className="file-name">{progress.fileName}</span>
//               <div className="progress-bar">
//                 <div 
//                   className={`progress-fill ${progress.status}`}
//                   style={{ width: `${progress.progress}%` }}
//                 />
//               </div>
//               <span className="progress-status">
//                 {progress.status === 'success' && '✅'}
//                 {progress.status === 'error' && '❌'}
//                 {progress.status === 'uploading' && `${progress.progress}%`}
//               </span>
//             </div>
//           ))}
//         </div>
//       )}    
     
//       <div className={`document-actions ${className}`}>
//         <div className="actions-container">
//           {availableActions.map((action) => (
//             <button
//               key={action}
//               className={`action-button ${action}`}
//               onClick={() => handleActionClick(action)}
//               title={actionConfig[action].label}
//               style={{ '--action-color': actionConfig[action].color } as React.CSSProperties}
//             >
//               <span className="action-icon">
//                 {actionConfig[action].icon}
//               </span>
//               <span className="action-label">
//                 {actionConfig[action].label}
//               </span>
//             </button>
//           ))}
//         </div>

//         {/* Информация о текущем выборе */}
//         <div className="selection-info">
//           {selectedFolder && (
//             <span className="info-item folder">
//               <span className="info-icon">📁</span>
//               <span className="info-text">{selectedFolder.name}</span>
//             </span>
//           )}
//           {selectedDocument && (
//             <>
//               <span className="info-separator">→</span>
//               <span className="info-item document">
//                 <span className="info-icon">📄</span>
//                 <span className="info-text">{selectedDocument.folder_name || selectedDocument.name}</span>
//                 <span 
//                   className="status-indicator"
//                   style={{ backgroundColor: getStatusColor(selectedDocument.status) }}
//                 >
//                   {selectedDocument.status}
//                 </span>
//               </span>
//             </>
//           )}
//         </div>
//       </div>
//     </>
//   );
// };

// // Вспомогательная функция для получения цвета статуса
// const getStatusColor = (status: DocumentStatus): string => {
//   const statusColors: Record<DocumentStatus, string> = {
//     'draft': '#666',
//     'in_review': '#f39c12',
//     'approved': '#27ae60',
//     'archived': '#7f8c8d',
//     'deleted': '#c0392b'
//   };
//   return statusColors[status] || '#666';
// };

// export default DocumentActions;

// components/DocumentActions.tsx
import React, { useContext } from 'react';
import { 
  FiFilePlus, 
  FiSend, 
  FiXCircle, 
  FiCheckCircle, 
  FiX, 
  FiRotateCcw, 
  FiArchive, 
  FiRefreshCw, 
  FiTrash2, 
  FiDownload, 
  FiEye,
  FiUploadCloud
} from 'react-icons/fi';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction, DocumentStatus } from '@/types/document';
import '../styles/DocumentActions.css';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { useAuth } from '@/wrappers/AuthProvider';
import { ViewLevel } from './FileExplorer';

interface DocumentActionsProps {
  onAction: (action: DocumentAction) => void;
  className?: string;
}

// Маппинг действий на иконки и текст
const actionConfig: Record<DocumentAction, { icon: React.ReactNode; label: string; color?: string }> = {
  [DocumentAction.CREATE_DOCUMENT]: { 
    icon: <FiFilePlus />, 
    label: 'Создать документ',
    color: '#4CAF50'
  },
  [DocumentAction.SUBMIT_FOR_REVIEW]: { 
    icon: <FiSend />, 
    label: 'На ревью',
    color: '#2196F3'
  },
  [DocumentAction.CANCEL_REVIEW]: { 
    icon: <FiXCircle />, 
    label: 'Отменить ревью',
    color: '#FF9800'
  },
  [DocumentAction.APPROVE]: { 
    icon: <FiCheckCircle />, 
    label: 'Утвердить',
    color: '#4CAF50'
  },
  [DocumentAction.REJECT]: { 
    icon: <FiX />, 
    label: 'Отклонить',
    color: '#F44336'
  },
  [DocumentAction.RETURN_TO_DRAFT]: { 
    icon: <FiRotateCcw />, 
    label: 'В черновик',
    color: '#9E9E9E'
  },
  [DocumentAction.ARCHIVE]: { 
    icon: <FiArchive />, 
    label: 'Архивировать',
    color: '#795548'
  },
  [DocumentAction.UNARCHIVE]: { 
    icon: <FiRefreshCw />, 
    label: 'Разархивировать',
    color: '#795548'
  },
  [DocumentAction.SOFT_DELETE]: { 
    icon: <FiTrash2 />, 
    label: 'Удалить',
    color: '#F44336'
  },
  [DocumentAction.RESTORE]: { 
    icon: <FiRefreshCw />, 
    label: 'Восстановить',
    color: '#4CAF50'
  },
  [DocumentAction.UPLOAD_NEW_VERSION]: { 
    icon: <FiUploadCloud />, 
    label: 'Новая версия',
    color: '#2196F3'
  },
  [DocumentAction.VIEW]: { 
    icon: <FiEye />, 
    label: 'Просмотр',
    color: '#607D8B'
  },
  [DocumentAction.DOWNLOAD]: { 
    icon: <FiDownload />, 
    label: 'Скачать',
    color: '#607D8B'
  }
};

// Маппинг статусов на доступные действия
const transitions: Record<DocumentStatus, DocumentAction[]> = {
  draft: [
    DocumentAction.SUBMIT_FOR_REVIEW,
    DocumentAction.SOFT_DELETE,
    DocumentAction.UPLOAD_NEW_VERSION
  ],
  'in_review': [
    DocumentAction.APPROVE,
    DocumentAction.REJECT,
    DocumentAction.CANCEL_REVIEW
  ],
  approved: [
    DocumentAction.ARCHIVE
  ],
  archived: [
    DocumentAction.UNARCHIVE
  ],
  deleted: [
    DocumentAction.RESTORE
  ]
};

const DocumentActions: React.FC<DocumentActionsProps> = ({onAction, className = ''}) => {
  const { context, updateContext, setFilePreview } = useContext(MainContext)!;
  const { user } = useAuth();
  const { isUploading, uploadProgress } = useDocumentUpload();
  
  // Получаем выбранную папку и выбранный документ из контекста
//   const selectedFolder = context.selectedFolder;
//   const selectedDocument = context.selectedDocument;
  const { selectedFolder, selectedDocument, currentStudy, currentSite} = context;

  // Определяем доступные действия
  const getAvailableActions = (): DocumentAction[] => {
    if (!selectedFolder) {
      return [DocumentAction.CREATE_DOCUMENT];
    }

    if (!selectedDocument) {
      return [DocumentAction.CREATE_DOCUMENT];
    }

    const statusActions = transitions[selectedDocument.status as DocumentStatus] || [];
    
    const commonActions = [
      DocumentAction.VIEW,
      DocumentAction.DOWNLOAD
    ];

    if (selectedDocument.status !== 'deleted' && selectedDocument.status !== 'archived') {
      return [...statusActions, ...commonActions, DocumentAction.UPLOAD_NEW_VERSION];
    }

    return [...statusActions, ...commonActions];
  };

  const availableActions = getAvailableActions();

  // Обработчик выбора файлов
  const handleFileSelect = () => {
    if (!selectedFolder) {
      alert('Сначала выберите папку');
      return;
    }

    if (!user?.id) {
      alert('Пользователь не авторизован');
      return;
    }

    // if (!context.currentStudy || !context.currentSite) {
    //   alert('Не выбрано исследование или сайт');
    //   return;
    // }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf,.txt,text/plain';
    input.multiple = false; // Пока что загружаем по одному файлу
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      
      if (!files || files.length === 0) return;
      
      const file = files[0];
      
      // Создаем превью и сохраняем в контекст
      setFilePreview({
        file,
        customName: file.name.replace(/\.[^/.]+$/, ''), // Убираем расширение
        size: file.size,
        studyId: context.currentStudy!,
        siteId: context.currentSite!,
        folderId: selectedFolder.id,
        folderName: selectedFolder.name,
        createdBy: user.email
      });
      
      input.remove();
    };
    
    input.click();
  };

  const handleCreateDocument = () => {
    handleFileSelect();
  };

  const handleActionClick = async (action: DocumentAction) => {
    if (action === DocumentAction.CREATE_DOCUMENT) {
      handleCreateDocument();
      return;
    }

    onAction(action);
  };

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Индикатор загрузки */}
      {isUploading && (
        <div className="upload-progress">
          {uploadProgress.map((progress, index) => (
            <div key={index} className="progress-item">
              <span className="file-name">{progress.fileName}</span>
              <div className="progress-bar">
                <div 
                  className={`progress-fill ${progress.status}`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <span className="progress-status">
                {progress.status === 'success' && '✅'}
                {progress.status === 'error' && '❌'}
                {progress.status === 'uploading' && `${progress.progress}%`}
              </span>
            </div>
          ))}
        </div>
      )}    
     
      <div className={`document-actions ${className}`}>
        <div className="actions-container">
          {context.currentLevel === ViewLevel.GENERAL || context.currentSite &&  availableActions.map((action) => (
            <button
              key={action}
              className={`action-button ${action}`}
              onClick={() => handleActionClick(action)}
              title={actionConfig[action].label}
              style={{ '--action-color': actionConfig[action].color } as React.CSSProperties}
            >
              <span className="action-icon">
                {actionConfig[action].icon}
              </span>
              <span className="action-label">
                {actionConfig[action].label}
              </span>
            </button>
          ))}
        </div>

        {/* Информация о текущем выборе */}
        <div className="selection-info">
          {selectedFolder && (
            <span className="info-item folder">
              <span className="info-icon">📁</span>
              <span className="info-text">{selectedFolder.name}</span>
            </span>
          )}
          {selectedDocument && (
            <>
              <span className="info-separator">→</span>
              <span className="info-item document">
                <span className="info-icon">📄</span>
                <span className="info-text">{selectedDocument.folder_name || selectedDocument.id}</span>
                <span 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(selectedDocument.status) }}
                >
                  {selectedDocument.status}
                </span>
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
};

// Вспомогательная функция для получения цвета статуса
const getStatusColor = (status: DocumentStatus): string => {
  const statusColors: Record<DocumentStatus, string> = {
    'draft': '#666',
    'in_review': '#f39c12',
    'approved': '#27ae60',
    'archived': '#7f8c8d',
    'deleted': '#c0392b'
  };
  return statusColors[status] || '#666';
};

export default DocumentActions;