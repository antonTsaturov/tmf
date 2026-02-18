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
  document_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  deleted_at: string | null;
  created_at: string;
}

const DeletedDocumentsViewer: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DeletedDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const isAdmin = user?.role?.some(item => item.includes(UserRole.ADMIN));

  console.log(user, isAdmin)
  const loadDeletedDocuments = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/documents/deleted', { credentials: 'include' });
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
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка восстановления');
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <button
          type="button"
          className="deleted-docs-refresh"
          onClick={loadDeletedDocuments}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      {error && <div className="deleted-docs-error">{error}</div>}

      {loading && documents.length === 0 ? (
        <div className="deleted-docs-loading">Загрузка...</div>
      ) : documents.length === 0 ? (
        <div className="deleted-docs-empty">Удалённых документов нет</div>
      ) : (
        <div className="deleted-docs-list">
          {documents.map((doc) => (
            <div key={doc.id} className="deleted-docs-item">
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
                onClick={() => handleRestore(doc.id)}
                disabled={restoringId === doc.id}
              >
                {restoringId === doc.id ? 'Восстановление...' : 'Восстановить'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeletedDocumentsViewer;
