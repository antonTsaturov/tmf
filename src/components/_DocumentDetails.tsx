// components/DocumentDetails.tsx
'use client';

import React, { useContext, useEffect, useState } from 'react';
import { 
  Box, 
  Card, 
  Flex, 
  Text, 
  Badge, 
  DataList,
  Tabs,
  ScrollArea,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Spinner,
  Separator,
  Dialog,
  TextArea
} from '@radix-ui/themes';
import { 
  FiFileText, 
  FiCalendar, 
  FiUser, 
  FiFolder, 
  FiHash, 
  FiHardDrive,
  FiDownload,
  FiEdit2,
  FiSave,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiInfo
} from 'react-icons/fi';
import { TbSum } from "react-icons/tb";
import { MainContext } from '@/wrappers/MainContext';
import { Document, DocumentLifeCycleStatus } from '@/types/document';
import DocumentStatusBadge from './DocumentStatusBadge';
import { useNotification } from '@/wrappers/NotificationContext';
import { FaCloudUploadAlt, FaRegFile, FaRegFilePdf } from 'react-icons/fa';

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
  const { addNotification } = useNotification();
  
  const selectedDocument = context.selectedDocument;
  const [versions, setVersions] = useState<DocumentVersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для редактирования названия
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

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
        setVersions(data.versions || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [selectedDocument?.id]);

  // Сброс состояния редактирования при смене документа
  useEffect(() => {
    setIsEditingName(false);
    setEditedName(selectedDocument?.document_name || '');
  }, [selectedDocument]);

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

  const handleEditName = () => {
    setEditedName(selectedDocument?.document_name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!selectedDocument || !editedName.trim() || editedName === selectedDocument.document_name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_name: editedName.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document name');
      }

      const updatedDoc = await response.json();
      
      // Обновляем документ в контексте
      updateContext({ 
        selectedDocument: { 
          ...selectedDocument, 
          document_name: editedName.trim() 
        } 
      });
      
      addNotification('success', 'Название документа обновлено');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating document name:', error);
      addNotification('error', 'Ошибка при обновлении названия');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveName();
    }
    if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  const renderUserInfo = (user?: { name?: string; email?: string } | null) => {
    if (!user) return <Text color="gray">—</Text>;
    return (
      <Tooltip content={user.email}>
        <Text>{user.name || user.email}</Text>
      </Tooltip>
    );
  };

  const getReviewStatusColor = (status?: string | null) => {
    switch (status) {
      case 'submitted': return 'blue';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  const getReviewStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'submitted': return 'Отправлен на ревью';
      case 'approved': return 'Утвержден';
      case 'rejected': return 'Отклонен';
      default: return status || '—';
    }
  };

  if (!selectedDocument) {
    return (
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        style={{ height: '100%', minHeight: 400 }}
        gap="4"
      >
        <Box style={{ fontSize: 48 }}>📋</Box>
        <Text size="4" color="gray">Выберите документ для просмотра сведений</Text>
      </Flex>
    );
  }

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
    <ScrollArea scrollbars="vertical" style={{ height: '100%' }}>
      <Box p="4">
        {/* Header with Document Icon and Name */}
        <Flex gap="4" align="start" mb="4">
          <Box 
            style={{ 
              width: 64, 
              height: 64, 
              backgroundColor: 'var(--blue-3)', 
              borderRadius: 'var(--radius-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FiFileText size={32} color="var(--blue-9)" />
          </Box>
          
          <Box style={{ flex: 1 }}>
            {isEditingName ? (
              <Flex direction="column" gap="2">
                <TextField.Root
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Введите название документа"
                    disabled={isSavingName}
                    autoFocus
                    size="3"
                  >
                </TextField.Root>
                <Flex gap="2" justify="end">
                  <Button 
                    size="1" 
                    variant="soft" 
                    color="gray" 
                    onClick={() => setIsEditingName(false)}
                    disabled={isSavingName}
                  >
                    Отмена
                  </Button>
                  <Button 
                    size="1" 
                    onClick={handleSaveName}
                    disabled={isSavingName || !editedName.trim() || editedName === doc.document_name}
                  >
                    {isSavingName ? (
                      <Flex align="center" gap="1">
                        <Spinner size="1" />
                        <Text>Сохранение...</Text>
                      </Flex>
                    ) : (
                      <Flex align="center" gap="1">
                        <FiSave size={14} />
                        <Text>Сохранить</Text>
                      </Flex>
                    )}
                  </Button>
                </Flex>
              </Flex>
            ) : (
              <Flex align="center" gap="2" wrap="wrap">
                <Text size="6" weight="bold">
                  {doc.document_name || doc.file_name || 'Без названия'}
                </Text>
                <Tooltip content="Редактировать название">
                  <IconButton 
                    size="1" 
                    variant="ghost" 
                    onClick={handleEditName}
                  >
                    <FiEdit2 size={14} />
                  </IconButton>
                </Tooltip>
                <Box>
                  <DocumentStatusBadge
                    status={
                      doc.is_archived
                      ? DocumentLifeCycleStatus.ARCHIVED 
                      : doc.is_deleted
                      ? DocumentLifeCycleStatus.DELETED 
                      : doc.status
                    }
                  />
                </Box>
              </Flex>
            )}
          </Box>
        </Flex>

        <Tabs.Root defaultValue="info">
          <Tabs.List>
            <Tabs.Trigger value="info">Информация</Tabs.Trigger>
            <Tabs.Trigger value="versions">История версий</Tabs.Trigger>
            {doc.review_status && <Tabs.Trigger value="review">Ревью</Tabs.Trigger>}
          </Tabs.List>

          {/* Info Tab */}
          <Tabs.Content value="info">
            <Box pt="4">
              <Card size="2">
                <Flex direction="column" gap="4">
                  {/* Basic Info */}
                  <Box>
                    <Text size="2" weight="bold" mb="2">Основная информация</Text>
                    <DataList.Root>
                      <DataList.Item>
                        <DataList.Label minWidth="120px">
                          <Flex align="center" gap="1">
                            <FiHash size={14} />
                            <Text>ID документа</Text>
                          </Flex>
                        </DataList.Label>
                        <DataList.Value>
                          <Badge variant="soft" color="gray">{doc.id}</Badge>
                        </DataList.Value>
                      </DataList.Item>

                      <DataList.Item>
                        <DataList.Label minWidth="120px">
                          <Flex align="center" gap="1">
                            <FiFolder size={14} />
                            <Text>Папка</Text>
                          </Flex>
                        </DataList.Label>
                        <DataList.Value>{doc.folder_name || '—'}</DataList.Value>
                      </DataList.Item>

                      {doc.tmf_zone && (
                        <DataList.Item>
                          <DataList.Label minWidth="120px">TMF Zone</DataList.Label>
                          <DataList.Value>
                            <Badge variant="soft" color="purple">{doc.tmf_zone}</Badge>
                          </DataList.Value>
                        </DataList.Item>
                      )}

                      {doc.tmf_artifact && (
                        <DataList.Item>
                          <DataList.Label minWidth="120px">TMF Artifact</DataList.Label>
                          <DataList.Value>
                            <Badge variant="soft" color="blue">{doc.tmf_artifact}</Badge>
                          </DataList.Value>
                        </DataList.Item>
                      )}
                    </DataList.Root>
                  </Box>

                  <Separator size="4" />

                  {/* Creation Info */}
                  <Box>
                    <Text size="2" weight="bold" mb="2">Создание</Text>
                    <DataList.Root>
                      <DataList.Item>
                        <DataList.Label minWidth="120px">
                          <Flex align="center" gap="1">
                            <FiCalendar size={14} />
                            <Text>Создан</Text>
                          </Flex>
                        </DataList.Label>
                        <DataList.Value>{formatDate(doc.created_at)}</DataList.Value>
                      </DataList.Item>

                      <DataList.Item>
                        <DataList.Label minWidth="120px">
                          <Flex align="center" gap="1">
                            <FiUser size={14} />
                            <Text>Кем создан</Text>
                          </Flex>
                        </DataList.Label>
                        <DataList.Value>{renderUserInfo(doc.creator)}</DataList.Value>
                      </DataList.Item>
                    </DataList.Root>
                  </Box>

                  <Separator size="4" />

                  {/* Last Version Info */}
                  <Box>
                    <Text size="2" weight="bold" mb="2">Последняя версия</Text>
                    <DataList.Root>
                      <DataList.Item>
                        <DataList.Label minWidth="120px">Номер версии</DataList.Label>
                        <DataList.Value>
                          <Badge variant="soft" color="blue">
                            {doc.document_number || '—'}
                          </Badge>
                        </DataList.Value>
                      </DataList.Item>

                      <DataList.Item>
                        <Flex align="center" gap="1">
                          <FaRegFilePdf size={14} />
                          <DataList.Label minWidth="120px">Тип файла</DataList.Label>
                        </Flex>
                        <DataList.Value>{doc.file_type || '—'}</DataList.Value>
                      </DataList.Item>

                      <DataList.Item>
                        <DataList.Label minWidth="120px">
                          <Flex align="center" gap="1">
                            <FiHardDrive size={14} />
                            <Text>Размер</Text>
                          </Flex>
                        </DataList.Label>
                        <DataList.Value>{formatFileSize(doc.file_size || 0)}</DataList.Value>
                      </DataList.Item>

                      <DataList.Item>
                        <Flex align="center" gap="1">
                          <TbSum size={14} />
                          <DataList.Label minWidth="120px">Checksum</DataList.Label>
                        </Flex>
                        <DataList.Value>
                          <Tooltip content={doc.checksum}>
                            <Text style={{ maxWidth: 200 }} truncate>
                              {doc.checksum || '—'}
                            </Text>
                          </Tooltip>
                        </DataList.Value>
                      </DataList.Item>

                      <DataList.Item>
                        <Flex align="center" gap="1">
                          <FaCloudUploadAlt size={14} />
                          <DataList.Label minWidth="120px">Загружено</DataList.Label>
                        </Flex>
                        <DataList.Value>{formatDate(doc.created_at)}</DataList.Value>
                      </DataList.Item>

                      <DataList.Item>
                          <Flex align="center" gap="1">
                            <FiUser size={14} />
                            <DataList.Label minWidth="120px">Кем загружено</DataList.Label>
                          </Flex>
                        <DataList.Value>{renderUserInfo(doc.last_uploader)}</DataList.Value>
                      </DataList.Item>
                    </DataList.Root>
                  </Box>

                  {/* Deletion/Restoration Info */}
                  {doc.is_deleted && (
                    <>
                      <Separator size="4" />
                      <Box>
                        <Text size="2" weight="bold" mb="2" color="red">Удаление</Text>
                        <DataList.Root>
                          <DataList.Item>
                            <DataList.Label minWidth="120px">Удален</DataList.Label>
                            <DataList.Value>{formatDate(doc.deleted_at || '')}</DataList.Value>
                          </DataList.Item>
                          {doc.deleter && (
                            <DataList.Item>
                              <DataList.Label minWidth="120px">Кем удален</DataList.Label>
                              <DataList.Value>{renderUserInfo(doc.deleter)}</DataList.Value>
                            </DataList.Item>
                          )}
                        </DataList.Root>
                      </Box>
                    </>
                  )}

                  {doc.restored_by && (
                    <>
                      <Separator size="4" />
                      <Box>
                        <Text size="2" weight="bold" mb="2" color="green">Восстановление</Text>
                        <DataList.Root>
                          <DataList.Item>
                            <DataList.Label minWidth="120px">Восстановлен</DataList.Label>
                            <DataList.Value>{formatDate(doc.restored_at || '')}</DataList.Value>
                          </DataList.Item>
                          {doc.restorer && (
                            <DataList.Item>
                              <DataList.Label minWidth="120px">Кем восстановлен</DataList.Label>
                              <DataList.Value>{renderUserInfo(doc.restorer)}</DataList.Value>
                            </DataList.Item>
                          )}
                        </DataList.Root>
                      </Box>
                    </>
                  )}
                </Flex>
              </Card>
            </Box>
          </Tabs.Content>

          {/* Versions Tab */}
          <Tabs.Content value="versions">
            <Box pt="4">
              <Card size="2">
                {loading && !doc.is_deleted ? (
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
                              <Flex align="center" gap="2" mt="2">
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
            </Box>
          </Tabs.Content>

          {/* Review Tab */}
          {doc.review_status && (
            <Tabs.Content value="review">
              <Box pt="4">
                <Card size="2">
                  <Flex direction="column" gap="4">
                    <DataList.Root>
                      <DataList.Item>
                        <DataList.Label minWidth="140px">Статус ревью</DataList.Label>
                        <DataList.Value>
                          <Badge 
                            size="2" 
                            variant="soft" 
                            color={getReviewStatusColor(doc.review_status)}
                          >
                            {getReviewStatusLabel(doc.review_status)}
                          </Badge>
                        </DataList.Value>
                      </DataList.Item>

                      {doc.assigned_reviewer && (
                        <DataList.Item>
                          <DataList.Label minWidth="140px">Назначен ревьюер</DataList.Label>
                          <DataList.Value>
                            <Flex align="center" gap="1">
                              <FiUser size={14} />
                              {renderUserInfo(doc.assigned_reviewer)}
                            </Flex>
                          </DataList.Value>
                        </DataList.Item>
                      )}

                      {doc.review_submitted_at && (
                        <DataList.Item>
                          <DataList.Label minWidth="140px">
                            <Flex align="center" gap="1">
                              <FiClock size={14} />
                              <Text>Отправлен</Text>
                            </Flex>
                          </DataList.Label>
                          <DataList.Value>{formatDate(doc.review_submitted_at)}</DataList.Value>
                        </DataList.Item>
                      )}

                      {doc.reviewer && (
                        <DataList.Item>
                          <DataList.Label minWidth="140px">Кем отправлен</DataList.Label>
                          <DataList.Value>{renderUserInfo(doc.reviewer)}</DataList.Value>
                        </DataList.Item>
                      )}

                      {doc.reviewed_at && (
                        <DataList.Item>
                          <DataList.Label minWidth="140px">Рассмотрен</DataList.Label>
                          <DataList.Value>{formatDate(doc.reviewed_at)}</DataList.Value>
                        </DataList.Item>
                      )}

                      {doc.approver && (
                        <DataList.Item>
                          <DataList.Label minWidth="140px">Кем рассмотрен</DataList.Label>
                          <DataList.Value>{renderUserInfo(doc.approver)}</DataList.Value>
                        </DataList.Item>
                      )}

                      {doc.review_comment && (
                        <DataList.Item>
                          <DataList.Label minWidth="140px">Комментарий</DataList.Label>
                          <DataList.Value>
                            <Box 
                              p="2" 
                              style={{ 
                                backgroundColor: 'var(--gray-3)', 
                                borderRadius: 'var(--radius-2)',
                                maxWidth: 300
                              }}
                            >
                              <Text size="1">{doc.review_comment}</Text>
                            </Box>
                          </DataList.Value>
                        </DataList.Item>
                      )}
                    </DataList.Root>
                  </Flex>
                </Card>
              </Box>
            </Tabs.Content>
          )}
        </Tabs.Root>
      </Box>
    </ScrollArea>
  );
};

export default DocumentDetails;