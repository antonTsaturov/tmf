'use client';

import React, { useContext, useEffect, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { Document } from '@/types/document';
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
      .then((data) => setVersions(data.versions || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [selectedDocument?.id]);

  const formatDate = (dateStr: string) => {
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

  const handleRestoreVersion = async (version: DocumentVersionRow) => {
    if (!selectedDocument) return;
    try {
      const res = await fetch(
        `/api/documents/${selectedDocument.id}/versions/${version.document_number}/restore`,
        { method: 'PUT' }
      );
      if (!res.ok) throw new Error('Ошибка восстановления');
      const data = await res.json();
      if (data.document) {
        updateContext({ selectedDocument: data.document });
      }
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка восстановления');
    }
  };

  if (!selectedDocument) {
    return (
      <div className="document-details document-details-empty">
        <div className="document-details-placeholder">
          <div className="placeholder-icon">📋</div>
          <p>Выберите документ для просмотра информации</p>
        </div>
      </div>
    );
  }

  const doc = selectedDocument as Document & { study_id?: number; site_id?: string; folder_id?: string };

  return (
    <div className="document-details">
      <div className="document-details-content">
        <section className="document-details-section">
          <h3 className="document-details-section-title">Метаданные</h3>
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
            <div className="metadata-row">
              <dt>Статус</dt>
              <dd>
                <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
              </dd>
            </div>
            <div className="metadata-row">
              <dt>Тип файла</dt>
              <dd>{doc.file_type || '—'}</dd>
            </div>
            <div className="metadata-row">
              <dt>Размер</dt>
              <dd>{formatFileSize(doc.file_size)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Checksum (SHA-256)</dt>
              <dd className="metadata-value-monospace metadata-value-truncate" title={doc.checksum}>
                {doc.checksum || '—'}
              </dd>
            </div>
            <div className="metadata-row">
              <dt>Загружено</dt>
              <dd>{formatDate(doc.uploaded_at || doc.created_at)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Кем загружено</dt>
              <dd>{doc.uploaded_by || doc.created_by || '—'}</dd>
            </div>
            <div className="metadata-row">
              <dt>Создано</dt>
              <dd>{formatDate(doc.created_at)}</dd>
            </div>
          </dl>
        </section>

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
                <div key={v.id} className="document-version-item">
                  <div className="version-main">
                    <div>
                      <span className="version-number">v. {v.document_number}</span>
                      <span className="version-date">{formatDate(v.uploaded_at)}</span>
                    </div>
                    <span className="version-size">{formatFileSize(v.file_size)}</span>
                    {v.change_reason && (
                      <span className="version-reason" title={v.change_reason}>
                        {v.change_reason}
                      </span>
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
                    {v.document_number !== doc.document_number && (
                      <button
                        type="button"
                        className="version-action-btn version-action-restore"
                        onClick={() => handleRestoreVersion(v)}
                      >
                        Восстановить
                      </button>
                    )}
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
