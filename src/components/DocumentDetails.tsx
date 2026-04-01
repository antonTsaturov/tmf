'use client';

import React, { useContext, useEffect, useState } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { Document } from '@/types/document';
import { DocumentLifeCycleStatus } from '@/types/document.status';
import DocumentStatusBadge from './DocumentStatusBadge';
import '../styles/DocumentDetails.css';
import { logger } from '@/lib/logger';
import { 
  Box, 
  Card, 
  Flex, 
  Text, 
  Badge, 
  IconButton,
  Tooltip,
  Spinner,
} from '@radix-ui/themes';
import { FiDownload, FiInfo, FiUser } from 'react-icons/fi';
import { useFolderName } from '@/hooks/useFolderName';
import { DocumentVersionRow } from '@/types/document';

const DocumentDetails: React.FC = () => {
  const getFolderName = useFolderName();
  const mainContext = useContext(MainContext);
  if (!mainContext) return null;
  const { context } = mainContext;
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

  const handleDownloadVersion = async (version: DocumentVersionRow) => {
    try {
      const response = await fetch(
        `/api/documents/${selectedDocument!.id}/versions/${version.document_number}?inline=false`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 500 && errorData.error === 'File integrity check failed') {
          addNotification(
            'error',
            `Ошибка целостности файла: ${version.file_name}. Файл мог быть повреждён в хранилище.`
          );
          logger.error('Download failed: checksum verification failed', null, {
            documentId: selectedDocument!.id,
            versionNumber: version.document_number,
            fileName: version.file_name
          });
          return;
        }

        addNotification('error', `Ошибка загрузки: ${errorData.message || response.statusText}`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `v${version.document_number}_${version.file_name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addNotification('success', `Файл ${version.file_name} загружен`);
    } catch (error) {
      logger.error('Download error', error);
      addNotification('error', 'Не удалось загрузить файл');
    }
  };

  const renderUserInfo = (user?: { name?: string; email?: string } | null) => {
    if (!user) return '—';
    return (
      <span className="user-info" title={user.email}>
        {user.name || user.email}
      </span>
    );
  };

  const getReviewStatusColor = (status?: string | null) => {
    switch (status) {
      case 'submitted': return 'blue';
      case 'approved': return 'green';
      default: return 'gray';
    }
  };

  const getReviewStatusLabel = (status: string) => {
    if (!status) return "Черновик"
    switch (status) {
      case 'submitted': return 'Документ отправлен на ревью';
      case 'approved': return 'Документ утвержден';
    }
  };

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
    // study_id?: number;
    // site_id?: string;
    // folder_id: string;
    //creator?: { id: string; name: string; email: string; role?: string[] } | null;
    deleter?: { id: string; name: string; email: string } | null;
    restorer_info?: { id: string; name: string; email: string } | null;
    deleted_by_info?: { name: string; email: string, role: string, deleted_at: string } | null;
    archived_by_info?: { name: string; email: string, role: string, archived_at: string } | null;
    unarchived_by_info?: { name: string; email: string, role: string } | null;
    unarchive_reason: string | null;
    // last_uploader?: { id: string; name: string; email: string } | null;
    // reviewer?: { id: string; name: string; email: string } | null;
    // approver?: { id: string; name: string; email: string } | null;
    // assigned_reviewer?: { id: string; name: string; email: string } | null;
    // review_status?: string | null;
    // review_submitted_at?: string | null;
    // reviewed_at?: string | null;
    // review_comment?: string | null;
  };

  logger.debug('Document Details', { document: doc });

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
                {doc.status && <DocumentStatusBadge
                  status={
                    doc.is_archived
                    ? DocumentLifeCycleStatus.ARCHIVED 
                    : doc.is_deleted
                    ? DocumentLifeCycleStatus.DELETED 
                    : doc.status
                  }
                />}
              </dd>
            </div>
            <div className="metadata-row">
              <dt>Папка</dt>
              <dd>{getFolderName(doc.folder_id) || '—'}</dd>
            </div>
            {doc.tmf_zone && <div className="metadata-row">
              <dt>TMF Zone</dt>
              <dd>{doc.tmf_zone || '—'}</dd>
            </div>}
            {doc.tmf_artifact && <div className="metadata-row">
              <dt>TMF Artifact</dt>
              <dd>{doc.tmf_artifact || '—'}</dd>
            </div>}
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
              <dt>Загружена</dt>
              <dd>{formatDate(doc.created_at)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Кто загрузил</dt>
              <dd>{renderUserInfo(doc.creator)}</dd>
            </div>
            <div className="metadata-row">
              <dt>Контрольная сумма</dt>
              <dd className="metadata-value-monospace metadata-value-truncate" title={doc.checksum}>
                {doc.current_version?.checksum || '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Информация о ревью */}
        {doc.current_version?.review_status && (
          <section className="document-details-section">
            <h3 className="document-details-section-title">Ревью</h3>
            <dl className="document-details-metadata">
              <div className="metadata-row">
                <dt>Статус ревью</dt>
                <dd>
                  <span className={`review-status review-status-${doc.current_version?.review_status}`}>
                    {doc.current_version?.review_status === 'submitted' ? 'Отправлен на ревью' :
                     doc.current_version?.review_status === 'approved' ? 'Утвержден' :
                     doc.current_version?.review_status === 'rejected' ? 'Отклонен' : doc.current_version?.review_status}
                  </span>
                </dd>
              </div>
              
              {doc.current_version?.assigned_reviewer && (
                <div className="metadata-row">
                  <dt>Назначеный ревьюер</dt>
                  <dd>{renderUserInfo(doc.current_version?.assigned_reviewer)}</dd>
                </div>
              )}
              
              {doc.current_version?.review_submitted_at && (
                <div className="metadata-row">
                  <dt>Когда отправлен</dt>
                  <dd>{formatDate(doc.current_version?.review_submitted_at)}</dd>
                </div>
              )}
              
              {doc.current_version?.review_submitter && (
                <div className="metadata-row">
                  <dt>Кем отправлен</dt>
                  <dd>{renderUserInfo(doc.current_version?.review_submitter)}</dd>
                </div>
              )}
                            
              {doc.current_version?.reviewed_at && (
                <div className="metadata-row">
                  <dt>Дата утверждения</dt>
                  <dd>{formatDate(doc.current_version?.reviewed_at)}</dd>
                </div>
              )}

              {doc.current_version?.approver?.id && (
                <div className="metadata-row">
                  <dt>Кем утвержден</dt>
                  <dd>{renderUserInfo(doc.current_version?.approver)}</dd>
                </div>
              )}
              
              {doc.current_version?.review_comment && (
                <div className="metadata-row">
                  <dt>Комментарий</dt>
                  <dd className="metadata-review-comment">{doc.current_version?.review_comment}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* Информация об архивировании */}
        {doc.is_archived && (
          <section className="document-details-section">
            <h3 className="document-details-section-title">Архивация</h3>
            <dl className="document-details-metadata">
              <div className="metadata-row">
                <dt>Документ архивирован</dt>
                <dd>{formatDate(doc.archived_at || '')}</dd>
              </div>
              {doc.archived_by_info && (
                <div className="metadata-row">
                  <dt>Кем архивирован</dt>
                  <dd>{renderUserInfo(doc.archived_by_info)}</dd>
                </div>
              )}

              {doc.archived_by_info?.archived_at && (
                <div className="metadata-row">
                  <dt>Когда архивирован</dt>
                  <dd>{formatDate(doc.archived_by_info?.archived_at)}</dd>
                </div>
              )}

            </dl>
          </section>
        )}


        {/* Информация о разархивировании */}
        {doc.unarchived_at && (
          <section className="document-details-section">
            <h3 className="document-details-section-title">Возвращен из архива</h3>
            <dl className="document-details-metadata">
              <div className="metadata-row">
                <dt>Документ разархивирован</dt>
                <dd>{formatDate(doc.unarchived_at || '')}</dd>
              </div>

              {doc.unarchived_by_info && (
                <div className="metadata-row">
                  <dt>Кем разархивирован</dt>
                  <dd>{renderUserInfo(doc.unarchived_by_info)}</dd>
                </div>
              )}

              {doc.unarchive_reason && (
                <div className="metadata-row">
                  <dt>Причина разархивации</dt>
                  <dd>{doc.unarchive_reason}</dd>
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
                <dt>Документ удален</dt>
                <dd>{formatDate(doc.deleted_at || '')}</dd>
              </div>

              {doc.deleted_by_info && (
                <div className="metadata-row">
                  <dt>Кем удален</dt>
                  <dd>{renderUserInfo(doc.deleted_by_info)}</dd>
                </div>
              )}

              {doc.deletion_reason && (
                <div className="metadata-row">
                  <dt>Причина удаления</dt>
                  <dd>{doc.deletion_reason}</dd>
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
              {doc.restorer_info && (
                <div className="metadata-row">
                  <dt>Кем восстановлен</dt>
                  <dd>{renderUserInfo(doc.restorer_info)}</dd>
                </div>
              )}
              {doc.restoration_reason && (
                <div className="metadata-row">
                  <dt>Причина восстановления</dt>
                  <dd>{doc.restoration_reason}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* История версий */}
        {!doc.is_deleted && <section className="document-details-section">
          <h3 className="document-details-section-title">История версий</h3>
          <Card size="2">
            {loading  ? (
              <Flex align="center" justify="center" py="6">
                <Spinner size="2" />
              </Flex>
            ) : error ? (
              <Box p="4" style={{ backgroundColor: 'var(--red-3)', borderRadius: 'var(--radius-2)' }}>
                <Text color="red">{error}</Text>
              </Box>
            ) : versions.length === 0 ? (
              <Flex align="center" justify="center" py="6">
                <Text color="gray">Нет версий</Text>
              </Flex>
            ) : (
              <Flex direction="column" gap="3">
                {versions.map((v) => (
                  <Card key={v.id} size="1" variant="surface">
                    <Flex gap="3" align="start" justify="between">
                      <Box style={{ flex: 1 }}>
                        <Flex align="center" gap="2" mb="1" wrap="wrap">
                          <Badge size="2" variant="solid" color="blue">
                            Версия {v.document_number}
                          </Badge>
                          {v.document_number === doc.document_number && (
                            <Badge size="1" variant="soft" color="green">
                              Текущая
                            </Badge>
                          )}
                          <Text size="1" color="gray">
                            {formatDate(v.uploaded_at)}
                          </Text>
                        </Flex>
                        
                        <Flex gap="3" mt="2" wrap="wrap">
                          <Badge size="1" variant="soft" color="gray">
                            {formatFileSize(v.file_size)}
                          </Badge>
                          
                          {v.change_reason && (
                            <Tooltip content={v.change_reason}>
                              <Badge size="1" variant="soft" color="purple">
                                <Flex align="center" gap="1">
                                  <FiInfo size={10} />
                                  <Text>Причина изменения</Text>
                                </Flex>
                              </Badge>
                            </Tooltip>
                          )}
                        </Flex>

                        {v.uploader && (
                          <Flex align="center" gap="1" mt="2">
                            <FiUser size={12} color="var(--gray-9)" />
                            <Text size="1" color="gray">
                              Загрузил: {v.uploader.name || v.uploader.email}
                            </Text>
                          </Flex>
                        )}

                        {v.review_status && (
                          <Flex gap="2" mt="2" direction='column' align="start" justify="start">
                            <Badge 
                              size="1" 
                              variant="soft" 
                              color={getReviewStatusColor(v.review_status)}
                            >
                              {getReviewStatusLabel(v.review_status)}
                            </Badge>
                            {v.assigned_reviewer && (
                              <Text size="1" color="gray">
                                → {v.assigned_reviewer.name || v.assigned_reviewer.email}
                              </Text>
                            )}
                          </Flex>
                        )}
                      </Box>
                      
                      <Tooltip content="Скачать эту версию">
                        <IconButton 
                          size="2" 
                          variant="soft" 
                          onClick={() => handleDownloadVersion(v)}
                        >
                          <FiDownload size={16} />
                        </IconButton>
                      </Tooltip>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            )}
          </Card>
        </section>}
      </div>
    </div>
  );
};

export default DocumentDetails;