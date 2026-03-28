// export default DeletedDocumentsViewer;
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';
import { UserRole } from '@/types/types';
import '@/styles/DeletedDocumentsViewer.css';
import {
  Card,
  Flex,
  Text,
  Badge,
  Button,
  Spinner,
  Callout,
  Table,
  Separator,
  Heading,
  IconButton,
  Dialog,
  Strong
} from '@radix-ui/themes';
import {
  UpdateIcon,
  TrashIcon,
  PersonIcon,
  CalendarIcon,
  FileIcon,
  ArchiveIcon,
  ReloadIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@radix-ui/react-icons';

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

  const getDocumentCountText = (count: number): string => {
    if (count === 1) return 'документ';
    if (count > 1 && count < 5) return 'документа';
    return 'документов';
  };

  if (!isAdmin) {
    return (
      <Callout.Root color="red" variant="surface" size="3">
        <Callout.Icon>
          <TrashIcon />
        </Callout.Icon>
        <Callout.Text>
          <Strong>Доступ запрещён</Strong>. Требуются права администратора.
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Flex direction="column" gap="4" p="5">
      {/* Header */}
      <Card>
        <Flex align="center" justify="between" gap="4">
          <Flex align="center" gap="3">
            <ArchiveIcon width="24" height="24" color="var(--gray-12)" />
            <Heading size="4">Удалённые документы</Heading>
          </Flex>
          <Flex align="center" gap="3">
            <Badge color="gray" variant="soft" size="2">
              <Flex gap="2" align="center">
                <FileIcon />
                {documents.length} {getDocumentCountText(documents.length)}
              </Flex>
            </Badge>
            <Button
              size="2"
              variant="surface"
              onClick={loadDeletedDocuments}
              disabled={loading}
            >
              <Flex gap="2" align="center">
                <ReloadIcon className={loading ? 'spin' : ''} />
                {loading ? 'Загрузка...' : 'Обновить'}
              </Flex>
            </Button>
          </Flex>
        </Flex>
      </Card>

      {/* Error */}
      {error && (
        <Callout.Root color="red" variant="soft">
          <Callout.Icon>
            <TrashIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {/* Loading */}
      {loading && documents.length === 0 ? (
        <Card>
          <Flex align="center" justify="center" gap="3" p="6">
            <Spinner size="3" />
            <Text size="2" weight="medium">Загрузка...</Text>
          </Flex>
        </Card>
      ) : documents.length === 0 ? (
        <Card>
          <Flex align="center" justify="center" gap="3" p="6">
            <ArchiveIcon width="48" height="48" color="var(--gray-8)" />
            <Text size="2" color="gray">Удалённых документов нет</Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {documents.map((doc) => (
            <Card key={doc.id} variant="surface">
              <Flex direction="column" gap="3">
                {/* Document Item Header */}
                <Flex
                  align="center"
                  justify="between"
                  gap="3"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(doc.id)}
                >
                  <Flex align="center" gap="3" style={{ flex: 1, minWidth: 0 }}>
                    <Badge color="red" variant="soft" size="2">
                      <TrashIcon />
                    </Badge>
                    <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                      <Text size="2" weight="medium" truncate>
                        {doc.document_name || doc.file_name || 'Без названия'}
                      </Text>
                      <Flex gap="3" wrap="wrap">
                        <Text size="1" color="gray">
                          <Flex gap="1" align="center">
                            {doc.folder_name}
                          </Flex>
                        </Text>
                        <Text size="1" color="gray">
                          <Flex gap="1" align="center">
                            <CalendarIcon />
                            Удалён: {formatDate(doc.deleted_at)}
                          </Flex>
                        </Text>
                        <Text size="1" color="gray">
                          {formatFileSize(doc.file_size)}
                        </Text>
                      </Flex>
                    </Flex>
                  </Flex>
                  <Button
                    size="2"
                    color="green"
                    variant="surface"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(doc.id);
                    }}
                    disabled={restoringId === doc.id}
                  >
                    <Flex gap="2" align="center">
                      <UpdateIcon className={restoringId === doc.id ? 'spin' : ''} />
                      {restoringId === doc.id ? 'Восстановление...' : 'Восстановить'}
                    </Flex>
                  </Button>
                  <IconButton
                    size="2"
                    variant="ghost"
                    color="gray"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(doc.id);
                    }}
                  >
                    {expandedId === doc.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </IconButton>
                </Flex>

                {/* Expanded Details */}
                {expandedId === doc.id && (
                  <>
                    <Separator size="4" />
                    <Flex direction="column" gap="3">
                      {/* Document Info - Compact Grid */}
                      <Flex gap="4" wrap="wrap">
                        <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                          <Text size="1" color="gray">ID</Text>
                          <Text size="2" weight="medium">{doc.id}</Text>
                        </Flex>
                        <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                          <Text size="1" color="gray">Study</Text>
                          <Text size="2">{doc.study_id}</Text>
                        </Flex>
                        <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                          <Text size="1" color="gray">Site</Text>
                          <Text size="2">{doc.site_id || '—'}</Text>
                        </Flex>
                        <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                          <Text size="1" color="gray">Версия</Text>
                          <Text size="2">{doc.document_number || 1}</Text>
                        </Flex>
                        <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                          <Text size="1" color="gray">Тип</Text>
                          <Text size="2">{doc.file_type}</Text>
                        </Flex>
                        <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                          <Text size="1" color="gray">Размер</Text>
                          <Text size="2">{formatFileSize(doc.file_size)}</Text>
                        </Flex>
                      </Flex>

                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">Папка</Text>
                        <Text size="2">{doc.folder_name} <Text color="gray">(ID: {doc.folder_id})</Text></Text>
                      </Flex>

                      {doc.tmf_zone && (
                        <Flex direction="column" gap="1">
                          <Text size="1" color="gray">TMF зона</Text>
                          <Text size="2">{doc.tmf_zone}</Text>
                        </Flex>
                      )}

                      {doc.tmf_artifact && (
                        <Flex direction="column" gap="1">
                          <Text size="1" color="gray">TMF артефакт</Text>
                          <Text size="2">{doc.tmf_artifact}</Text>
                        </Flex>
                      )}

                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">Файл</Text>
                        <Text size="2" truncate>{doc.file_name}</Text>
                      </Flex>

                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">Создан</Text>
                        <Text size="2">{formatDate(doc.created_at)}</Text>
                      </Flex>

                      {/* Deletion Info */}
                      <Card variant="surface" mt="2">
                        <Flex direction="column" gap="2">
                          <Flex gap="2" align="center">
                            <TrashIcon color="var(--red-9)" />
                            <Text size="1" weight="medium">Удаление</Text>
                          </Flex>
                          <Flex gap="4" wrap="wrap">
                            <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                              <Text size="1" color="gray">Дата</Text>
                              <Text size="2">{formatDate(doc.deleted_at)}</Text>
                            </Flex>
                            <Flex direction="column" gap="1" style={{ flex: '1 1 200px' }}>
                              <Text size="1" color="gray">Кто</Text>
                              <Text size="2">
                                {doc.deleted_by_name || doc.deleted_by || 'Неизвестно'}
                                {doc.deleted_by_email && (
                                  <Text color="gray"> ({doc.deleted_by_email})</Text>
                                )}
                              </Text>
                            </Flex>
                          </Flex>
                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray">Причина</Text>
                            <Text size="2" color={doc.deletion_reason ? 'gray' : 'amber'}>
                              {doc.deletion_reason || 'Не указана'}
                            </Text>
                          </Flex>
                        </Flex>
                      </Card>

                      {/* Restoration Info */}
                      {doc.restored_at && (
                        <Card variant="surface">
                          <Flex direction="column" gap="2">
                            <Flex gap="2" align="center">
                              <UpdateIcon color="var(--green-9)" />
                              <Text size="1" weight="medium">Восстановление</Text>
                            </Flex>
                            <Flex gap="4" wrap="wrap">
                              <Flex direction="column" gap="1" style={{ flex: '1 1 140px' }}>
                                <Text size="1" color="gray">Дата</Text>
                                <Text size="2">{formatDate(doc.restored_at)}</Text>
                              </Flex>
                              <Flex direction="column" gap="1" style={{ flex: '1 1 200px' }}>
                                <Text size="1" color="gray">Кто</Text>
                                <Text size="2">
                                  {doc.restored_by_name || doc.restored_by || 'Неизвестно'}
                                  {doc.restored_by_email && (
                                    <Text color="gray"> ({doc.restored_by_email})</Text>
                                  )}
                                </Text>
                              </Flex>
                            </Flex>
                          </Flex>
                        </Card>
                      )}
                    </Flex>
                  </>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
};

export default DeletedDocumentsViewer;