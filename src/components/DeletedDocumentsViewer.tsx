// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useAuth } from '@/wrappers/AuthProvider';
// import { UserRole } from '@/types/types';
// import '../styles/DeletedDocumentsViewer.css';

// interface DeletedDocument {
//   id: string;
//   study_id: number;
//   site_id: string | null;
//   folder_id: string;
//   folder_name: string;
//   document_name: string;
//   file_name: string;
//   file_type: string;
//   file_size: number;
//   deleted_at: string | null;
//   created_at: string;
// }

// const DeletedDocumentsViewer: React.FC = () => {
//   const { user } = useAuth();
//   const [documents, setDocuments] = useState<DeletedDocument[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [restoringId, setRestoringId] = useState<string | null>(null);

//   const isAdmin = user?.role?.some(item => item.includes(UserRole.ADMIN));

//   const loadDeletedDocuments = useCallback(async () => {
//     if (!isAdmin) return;

//     setLoading(true);
//     setError(null);

//     try {
//       const res = await fetch('/api/documents/deleted', { credentials: 'include' });
//       if (!res.ok) {
//         if (res.status === 403) {
//           setError('Доступ запрещён');
//           setDocuments([]);
//           return;
//         }
//         throw new Error('Ошибка загрузки');
//       }
//       const data = await res.json();
//       setDocuments(data.documents || []);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Ошибка загрузки');
//       setDocuments([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [isAdmin]);

//   useEffect(() => {
//     loadDeletedDocuments();
//   }, [loadDeletedDocuments]);

//   const handleRestore = async (id: string) => {
//     setRestoringId(id);
//     try {

//       const res = await fetch(`/api/documents/${id}/restore`, {
//         method: 'POST',
//         credentials: 'include',
//       });

//       if (!res.ok) {
//         const data = await res.json().catch(() => ({}));
//         throw new Error(data.error || 'Ошибка восстановления');
//       }

//       setDocuments((prev) => prev.filter((d) => d.id !== id));

//     } catch (err) {
//       alert(err instanceof Error ? err.message : 'Ошибка восстановления');

//     } finally {
//       setRestoringId(null);
//     }
//   };

//   const formatDate = (dateStr: string | null) => {
//     if (!dateStr) return '—';
//     return new Date(dateStr).toLocaleDateString('ru-RU', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     });
//   };

//   const formatFileSize = (bytes: number) => {
//     if (!bytes) return '0 B';
//     const k = 1024;
//     const sizes = ['B', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   if (!isAdmin) {
//     return (
//       <div className="deleted-docs-viewer deleted-docs-access-denied">
//         <p>Доступ запрещён. Требуются права администратора.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="deleted-docs-viewer">
//       <div className="deleted-docs-header">
//         <h3>Удалённые документы</h3>
//         <button
//           type="button"
//           className="deleted-docs-refresh"
//           onClick={loadDeletedDocuments}
//           disabled={loading}
//         >
//           {loading ? 'Загрузка...' : 'Обновить'}
//         </button>
//       </div>

//       {error && <div className="deleted-docs-error">{error}</div>}

//       {loading && documents.length === 0 ? (
//         <div className="deleted-docs-loading">Загрузка...</div>
//       ) : documents.length === 0 ? (
//         <div className="deleted-docs-empty">Удалённых документов нет</div>
//       ) : (
//         <div className="deleted-docs-list">
//           {documents.map((doc) => (
//             <div key={doc.id} className="deleted-docs-item">
//               <div className="deleted-docs-item-main">
//                 <span className="deleted-docs-name" title={doc.document_name || doc.file_name}>
//                   {doc.document_name || doc.file_name || 'Без названия'}
//                 </span>
//                 <span className="deleted-docs-folder">{doc.folder_name}</span>
//                 <span className="deleted-docs-date">
//                   Удалён: {formatDate(doc.deleted_at)}
//                 </span>
//                 <span className="deleted-docs-size">{formatFileSize(doc.file_size)}</span>
//               </div>
//               <button
//                 type="button"
//                 className="deleted-docs-restore-btn"
//                 onClick={() => handleRestore(doc.id)}
//                 disabled={restoringId === doc.id}
//               >
//                 {restoringId === doc.id ? 'Восстановление...' : 'Восстановить'}
//               </button>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default DeletedDocumentsViewer;
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';
import { UserRole } from '@/types/types';
import '../styles/DeletedDocumentsViewer.css';

interface DeletedDocument {
  id: string;
  study_id: number;
  site_id: string | null;
  folder_id: string;
  folder_name: string;
  tmf_zone: string | null;
  tmf_artifact: string | null;
  document_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  document_number: number;
  
  // Информация об удалении
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_by_name: string | null;
  deleted_by_email: string | null;
  deletion_reason: string | null;
  
  // Информация о восстановлении
  restored_at: string | null;
  restored_by: string | null;
  restored_by_name: string | null;
  restored_by_email: string | null;
  
  created_at: string;
}

const DeletedDocumentsViewer: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DeletedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAdmin = user?.role?.some(item => item.includes(UserRole.ADMIN));

  const loadDeletedDocuments = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/documents/deleted', { 
        credentials: 'include' 
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          setError('Доступ запрещён');
          setDocuments([]);
          return;
        }
        throw new Error('Ошибка загрузки');
      }
      
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadDeletedDocuments();
  }, [loadDeletedDocuments]);

  const handleRestore = async (id: string) => {
    if (!confirm('Вы уверены, что хотите восстановить этот документ?')) {
      return;
    }

    setRestoringId(id);
    try {
      const res = await fetch(`/api/documents/${id}/restore`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка восстановления');
      }
      
      // Убираем восстановленный документ из списка
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setExpandedId(null);
      
      // Показываем сообщение об успехе
      alert('Документ успешно восстановлен');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка восстановления');
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!isAdmin) {
    return (
      <div className="deleted-docs-viewer deleted-docs-access-denied">
        <p>Доступ запрещён. Требуются права администратора.</p>
      </div>
    );
  }

  return (
    <div className="deleted-docs-viewer">
      <div className="deleted-docs-header">
        <h3>Удалённые документы</h3>
        <div className="deleted-docs-header-actions">
          <span className="deleted-docs-count">
            {documents.length} {documents.length === 1 ? 'документ' : 
              documents.length > 1 && documents.length < 5 ? 'документа' : 'документов'}
          </span>
          <button
            type="button"
            className="deleted-docs-refresh"
            onClick={loadDeletedDocuments}
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>
      </div>

      {error && <div className="deleted-docs-error">{error}</div>}

      {loading && documents.length === 0 ? (
        <div className="deleted-docs-loading">Загрузка...</div>
      ) : documents.length === 0 ? (
        <div className="deleted-docs-empty">Удалённых документов нет</div>
      ) : (
        <div className="deleted-docs-list">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className={`deleted-docs-item ${expandedId === doc.id ? 'expanded' : ''}`}
            >
              <div className="deleted-docs-item-header" onClick={() => toggleExpand(doc.id)}>
                <div className="deleted-docs-item-main">
                  <span className="deleted-docs-name" title={doc.document_name || doc.file_name}>
                    {doc.document_name || doc.file_name || 'Без названия'}
                  </span>
                  <span className="deleted-docs-folder">{doc.folder_name}</span>
                  <span className="deleted-docs-date">
                    Удалён: {formatDate(doc.deleted_at)}
                  </span>
                  <span className="deleted-docs-size">{formatFileSize(doc.file_size)}</span>
                </div>
                <button
                  type="button"
                  className="deleted-docs-restore-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(doc.id);
                  }}
                  disabled={restoringId === doc.id}
                >
                  {restoringId === doc.id ? 'Восстановление...' : 'Восстановить'}
                </button>
              </div>

              {expandedId === doc.id && (
                <div className="deleted-docs-item-details">
                  <div className="deleted-docs-details-grid">
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">ID документа:</span>
                      <span className="detail-value">{doc.id}</span>
                    </div>
                    
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">Study ID:</span>
                      <span className="detail-value">{doc.study_id}</span>
                    </div>
                    
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">Site ID:</span>
                      <span className="detail-value">{doc.site_id || '—'}</span>
                    </div>
                    
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">Папка:</span>
                      <span className="detail-value">{doc.folder_name} (ID: {doc.folder_id})</span>
                    </div>
                    
                    {doc.tmf_zone && (
                      <div className="deleted-docs-detail-row">
                        <span className="detail-label">TMF зона:</span>
                        <span className="detail-value">{doc.tmf_zone}</span>
                      </div>
                    )}
                    
                    {doc.tmf_artifact && (
                      <div className="deleted-docs-detail-row">
                        <span className="detail-label">TMF артефакт:</span>
                        <span className="detail-value">{doc.tmf_artifact}</span>
                      </div>
                    )}
                    
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">Версия:</span>
                      <span className="detail-value">{doc.document_number || 1}</span>
                    </div>
                    
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">Тип файла:</span>
                      <span className="detail-value">{doc.file_type}</span>
                    </div>
                    
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">Имя файла:</span>
                      <span className="detail-value">{doc.file_name}</span>
                    </div>
                    
                    <div className="deleted-docs-detail-row">
                      <span className="detail-label">Дата создания:</span>
                      <span className="detail-value">{formatDate(doc.created_at)}</span>
                    </div>
                  </div>

                  <div className="deleted-docs-deletion-info">
                    <h4>Информация об удалении</h4>
                    <div className="deleted-docs-details-grid">
                      <div className="deleted-docs-detail-row">
                        <span className="detail-label">Дата удаления:</span>
                        <span className="detail-value">{formatDate(doc.deleted_at)}</span>
                      </div>
                      
                      <div className="deleted-docs-detail-row">
                        <span className="detail-label">Кто удалил:</span>
                        <span className="detail-value">
                          {doc.deleted_by_name ? (
                            <>
                              {doc.deleted_by_name} 
                              {doc.deleted_by_email && ` (${doc.deleted_by_email})`}
                            </>
                          ) : (
                            doc.deleted_by || 'Неизвестно'
                          )}
                        </span>
                      </div>
                      
                      <div className="deleted-docs-detail-row detail-row-full">
                        <span className="detail-label">Причина удаления:</span>
                        <span className="detail-value detail-value-reason">
                          {doc.deletion_reason || 'Не указана'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {doc.restored_at && (
                    <div className="deleted-docs-restoration-info">
                      <h4>Информация о восстановлении</h4>
                      <div className="deleted-docs-details-grid">
                        <div className="deleted-docs-detail-row">
                          <span className="detail-label">Дата восстановления:</span>
                          <span className="detail-value">{formatDate(doc.restored_at)}</span>
                        </div>
                        
                        <div className="deleted-docs-detail-row">
                          <span className="detail-label">Кто восстановил:</span>
                          <span className="detail-value">
                            {doc.restored_by_name ? (
                              <>
                                {doc.restored_by_name}
                                {doc.restored_by_email && ` (${doc.restored_by_email})`}
                              </>
                            ) : (
                              doc.restored_by || 'Неизвестно'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeletedDocumentsViewer;