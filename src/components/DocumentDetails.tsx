'use client';

import React, { useContext, useEffect, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { Document, DocumentLifeCycleStatus, DocumentWorkFlowStatus } from '@/types/document';
import DocumentStatusBadge from './DocumentStatusBadge';
// import { StudyUser } from '@/types/types';
// import { ROLE_CONFIG } from '@/types/types';
import '../styles/DocumentDetails.css';


interface DocumentVersionRow {
  id: string;
  document_id: string;
  document_number: number;
  document_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  checksum: string;
  uploaded_by: string;
  uploaded_at: string;
  change_reason: string | null;
  review_status?: string | null;
  review_submitted_at?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
  
  // Информация о пользователях
  uploader?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  approver?: {
    id: string;
    name: string;
    email: string;
  } | null;
  assigned_reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const DocumentDetails: React.FC = () => {
  const mainContext = useContext(MainContext);
  if (!mainContext) return null;
  const { context, updateContext } = mainContext;
  const selectedDocument = context.selectedDocument;
  const [versions, setVersions] = useState<DocumentVersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDocument?.id) {
      setVersions([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/documents/${selectedDocument.id}/versions`)
      .then((res) => {
        if (!res.ok) throw new Error('Не удалось загрузить версии');
        return res.json();
      })
      .then((data) => {
        // API должно возвращать версии с пользовательскими данными
        setVersions(data.versions || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [selectedDocument?.id]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number | string) => {
    const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(n) || n === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadVersion = (version: DocumentVersionRow) => {
    window.open(
      `/api/documents/${selectedDocument!.id}/versions/${version.document_number}?inline=false`,
      '_blank'
    );
  };

  // const handleRestoreVersion = async (version: DocumentVersionRow) => {
  //   if (!selectedDocument) return;
  //   try {
  //     const res = await fetch(
  //       `/api/documents/${selectedDocument.id}/versions/${version.document_number}/restore`,
  //       { method: 'PUT' }
  //     );
  //     if (!res.ok) throw new Error('Ошибка восстановления');
  //     const data = await res.json();
  //     if (data.document) {
  //       updateContext({ selectedDocument: data.document });
  //     }
  //     window.location.reload();
  //   } catch (err) {
  //     alert(err instanceof Error ? err.message : 'Ошибка восстановления');
  //   }
  // };

  const renderUserInfo = (user?: { name?: string; email?: string } | null) => {
    if (!user) return '—';
    return (
      <span className="user-info" title={user.email}>
        {user.name || user.email}
      </span>
    );
  };

  // const getStatusBadge = (status: string) => {
  //   const statusConfig: Record<string, { label: string; color: string }> = {
  //     draft: { label: 'DRAFT', color: '#666' },
  //     in_review: { label: 'IN REVIEW', color: '#f39c12' },
  //     approved: { label: 'APPROVED', color: '#27ae60' },
  //     archived: { label: 'ARCHIVED', color: '#7f8c8d' },
  //     deleted: { label: 'DELETED', color: '#c0392b' },
  //   };
    
  //   const config = statusConfig[status] || { label: status, color: '#666' };
    
  //   return (
  //     <span 
  //       className="status-badge"
  //       style={{ 
  //         backgroundColor: config.color + '20',
  //         color: config.color,
  //         borderColor: config.color + '40'
  //       }}
  //     >
  //       {config.label}
  //     </span>
  //   );
  // };

  if (!selectedDocument) {
    return (
      <div className="document-details document-details-empty">
        <div className="document-details-placeholder">
          <div className="placeholder-icon">📋</div>
          <p>Выберите документ для просмотра сведений</p>
        </div>
      </div>
    );
  }

  // Приводим selectedDocument к расширенному типу с пользовательскими полями
  const doc = selectedDocument as Document & {
    study_id?: number;
    site_id?: string;
    folder_id?: string;
    creator?: { id: string; name: string; email: string; role?: string[] } | null;
    deleter?: { id: string; name: string; email: string } | null;
    restorer?: { id: string; name: string; email: string } | null;
    last_uploader?: { id: string; name: string; email: string } | null;
    reviewer?: { id: string; name: string; email: string } | null;
    approver?: { id: string; name: string; email: string } | null;
    assigned_reviewer?: { id: string; name: string; email: string } | null;
    review_status?: string | null;
    review_submitted_at?: string | null;
    reviewed_at?: string | null;
    review_comment?: string | null;
  };

  return (
    <div className="document-details">
      <div className="document-details-content">
        {/* Основная информация */}
        <section className="document-details-section">
          <h3 className="document-details-section-title">Основная информация</h3>
          <dl className="document-details-metadata">
            <div className="metadata-row">
              <dt>Название</dt>
              <dd>{doc.document_name || doc.file_name || '—'}</dd>
            </div>
            <div className="metadata-row">
              <dt>ID документа</dt>
              <dd className="metadata-value-monospace">{doc.id}</dd>
            </div>
            <div className="metadata-row">
              <dt>Статус</dt>
              <dd>
                <DocumentStatusBadge
                  status={
                    doc.is_archived
                    ? DocumentLifeCycleStatus.ARCHIVED 
                    : doc.is_deleted
                    ? DocumentLifeCycleStatus.DELETED 
                    : doc.status
                  }
                />
              </dd>
            </div>
            <div className="metadata-row">
              <dt>Папка</dt>
              <dd>{doc.folder_name || '—'}</dd>
            </div>
            <div className="metadata-row">
              <dt>TMF Zone</dt>
              <dd>{doc.tmf_zone || '—'}</dd>
            </div>
            <div className="metadata-row">
              <dt>TMF Artifact</dt>
              <dd>{doc.tmf_artifact || '—'}</dd>
            </div>
          </dl>
        </section>

        {/* Информация о создании */}
        <section className="document-details-section">
          <h3 className="document-details-section-title">Создание</h3>
          <dl className="document-details-metadata">
            <div className="metadata-row">
              <dt>Создан</dt>
              <dd>{formatDate(doc.created_at)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Кем создан</dt>
              <dd>{renderUserInfo(doc.creator)}</dd>
            </div>
          </dl>
        </section>

        {/* Информация о последней версии */}
        <section className="document-details-section">
          <h3 className="document-details-section-title">Последняя версия</h3>
          <dl className="document-details-metadata">
            <div className="metadata-row">
              <dt>Номер версии</dt>
              <dd>{doc.document_number || '—'}</dd>
            </div>
            <div className="metadata-row">
              <dt>Тип файла</dt>
              <dd>{doc.file_type || '—'}</dd>
            </div>
            <div className="metadata-row">
              <dt>Размер</dt>
              <dd>{formatFileSize(doc.file_size || 0)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Загружено</dt>
              <dd>{formatDate(doc.created_at)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Кем загружено</dt>
              <dd>{renderUserInfo(doc.last_uploader)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Checksum</dt>
              <dd className="metadata-value-monospace metadata-value-truncate" title={doc.checksum}>
                {doc.checksum || '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Информация о ревью */}
        {doc.review_status && (
          <section className="document-details-section">
            <h3 className="document-details-section-title">Ревью</h3>
            <dl className="document-details-metadata">
              <div className="metadata-row">
                <dt>Статус ревью</dt>
                <dd>
                  <span className={`review-status review-status-${doc.review_status}`}>
                    {doc.review_status === 'submitted' ? 'Отправлен на ревью' :
                     doc.review_status === 'approved' ? 'Утвержден' :
                     doc.review_status === 'rejected' ? 'Отклонен' : doc.review_status}
                  </span>
                </dd>
              </div>
              
              {doc.assigned_reviewer && (
                <div className="metadata-row">
                  <dt>Назначен ревьюер</dt>
                  <dd>{renderUserInfo(doc.assigned_reviewer)}</dd>
                </div>
              )}
              
              {doc.review_submitted_at && (
                <div className="metadata-row">
                  <dt>Отправлен на ревью</dt>
                  <dd>{formatDate(doc.review_submitted_at)}</dd>
                </div>
              )}
              
              {doc.reviewer && (
                <div className="metadata-row">
                  <dt>Кем отправлен</dt>
                  <dd>{renderUserInfo(doc.reviewer)}</dd>
                </div>
              )}
              
              {doc.reviewed_at && (
                <div className="metadata-row">
                  <dt>Рассмотрен</dt>
                  <dd>{formatDate(doc.reviewed_at)}</dd>
                </div>
              )}
              
              {doc.approver && (
                <div className="metadata-row">
                  <dt>Кем рассмотрен</dt>
                  <dd>{renderUserInfo(doc.approver)}</dd>
                </div>
              )}
              
              {doc.review_comment && (
                <div className="metadata-row">
                  <dt>Комментарий</dt>
                  <dd className="metadata-review-comment">{doc.review_comment}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* Информация об удалении/восстановлении */}
        {doc.is_deleted && (
          <section className="document-details-section">
            <h3 className="document-details-section-title">Удаление</h3>
            <dl className="document-details-metadata">
              <div className="metadata-row">
                <dt>Удален</dt>
                <dd>{formatDate(doc.deleted_at || '')}</dd>
              </div>
              {doc.deleter && (
                <div className="metadata-row">
                  <dt>Кем удален</dt>
                  <dd>{renderUserInfo(doc.deleter)}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {doc.restored_by && (
          <section className="document-details-section">
            <h3 className="document-details-section-title">Восстановление</h3>
            <dl className="document-details-metadata">
              <div className="metadata-row">
                <dt>Восстановлен</dt>
                <dd>{formatDate(doc.restored_at || '')}</dd>
              </div>
              {doc.restorer && (
                <div className="metadata-row">
                  <dt>Кем восстановлен</dt>
                  <dd>{renderUserInfo(doc.restorer)}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* История версий */}
        <section className="document-details-section">
          <h3 className="document-details-section-title">История версий</h3>
          {loading ? (
            <div className="document-details-loading">Загрузка...</div>
          ) : error ? (
            <div className="document-details-error">{error}</div>
          ) : versions.length === 0 ? (
            <p className="document-details-empty-text">Нет версий</p>
          ) : (
            <div className="document-versions-list">
              {versions.map((v) => (
                <div 
                  key={v.id} 
                  className={`document-version-item ${v.document_number === doc.document_number ? 'current-version' : ''}`}
                >
                  <div className="version-main">
                    <div className="version-header">
                      <span className="version-number">Версия {v.document_number}</span>
                      {v.document_number === doc.document_number && (
                        <span className="current-version-badge">Текущая</span>
                      )}
                      <span className="version-date">{formatDate(v.uploaded_at)}</span>
                    </div>
                    
                    <div className="version-details">
                      <span className="version-size">{formatFileSize(v.file_size)}</span>
                      {v.change_reason && (
                        <span className="version-reason" title={v.change_reason}>
                          {v.change_reason}
                        </span>
                      )}
                    </div>

                    {/* Информация о загрузившем */}
                    {v.uploader && (
                      <div className="version-user-info">
                        <span className="user-label">Загрузил:</span>
                        <span className="user-value" title={v.uploader.email}>
                          {v.uploader.name || v.uploader.email}
                        </span>
                      </div>
                    )}

                    {/* Информация о ревью для версии */}
                    {v.review_status && (
                      <div className="version-review-info">
                        <span className={`review-badge review-${v.review_status}`}>
                          {v.review_status}
                        </span>
                        {v.assigned_reviewer && (
                          <span className="reviewer-info" title={v.assigned_reviewer.email}>
                            → {v.assigned_reviewer.name || v.assigned_reviewer.email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="version-actions">
                    <button
                      type="button"
                      className="version-action-btn"
                      onClick={() => handleDownloadVersion(v)}
                    >
                      Скачать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DocumentDetails;