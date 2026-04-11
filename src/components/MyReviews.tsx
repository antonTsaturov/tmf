// app/reviews/MyReviewsModal.tsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { 
  Dialog,
  Flex, 
  Text, 
  Card, 
  Box, 
  Button,
  Badge,
  Table,
  TextField,
  Select,
  Spinner,
  IconButton,
  Tooltip,
  Separator
} from '@radix-ui/themes';
import {
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiEye,
  FiDownload,
  FiUser,
  FiFolder,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiX
} from 'react-icons/fi';
import { useNotification } from '@/wrappers/NotificationContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useStudiesAndSites } from '@/hooks/useStudiesAndSites';
import DocumentReviewPanel from "./panels/ReviewDocumentPanel";
import { MainContext } from '@/wrappers/MainContext';
import { Document } from '@/types/document';
import { logger } from '@/lib/utils/logger';

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface MyReviewsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete?: () => void;
}

export const MyReviews: React.FC<MyReviewsModalProps> = ({ 
  open, 
  onOpenChange,
}) => {
  const { addNotification } = useNotification();
  const { context, updateContext } = useContext(MainContext)!;
  const { onDocumentUpdatedId } = context;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false
  });

  // Фильтры
  const [studyFilter, setStudyFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  // const [folderFilter, setFolderFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  const { 
    getStudyProtocol, 
    getSiteName, 
    loading: metadataLoading 
  } = useStudiesAndSites();

  // Загрузка документов
  const fetchPendingReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });

      if (studyFilter) params.append('study_id', studyFilter);
      if (siteFilter) params.append('site_id', siteFilter);
      // if (folderFilter) params.append('folder_id', folderFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/documents/reviews/pending?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending reviews');
      }

      const data = await response.json();
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (error) {
      logger.error('Error fetching pending reviews', error);
      addNotification('error', 'Error loading documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPendingReviews();
    }
  }, [open, pagination.offset, studyFilter, siteFilter, searchQuery]);

  // Обработчики пагинации
  const handleNextPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const handlePrevPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit)
    }));
  };


  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const getDeclension = (count: number, words: [string, string, string]) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[
        count % 100 > 4 && count % 100 < 20 ? 2 : cases[Math.min(count % 10, 5)]
    ];
  };

  // Обновление списка после Apprve / Reject
  useEffect(() => {
    setDocuments(prev => prev.filter(d => d.id !== onDocumentUpdatedId));
    // Очищаем onDocumentUpdatedId
    return () => updateContext({ onDocumentUpdatedId: undefined });
  }, [onDocumentUpdatedId]);  

  return (
    <>
      <DocumentReviewPanel
        // onSuccess={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
        // onReject={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
    
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Content style={{ maxWidth: 1200, width: '95vw', height: '85vh', padding: 0 }}>
        {/* Header */}
        <Flex 
        direction="column"
        p="4" 
        style={{ borderBottom: '1px solid var(--gray-5)' }}
        >
        {/* Верхняя строка с заголовком и кнопками */}
        <Flex justify="between" align="center">
            <Flex align="center" gap="2">
            <Box className="rt-AvatarRoot" style={{ width: 32, height: 32 }}>
                <FiCheckCircle size={20} color="var(--blue-9)" />
            </Box>
            <Dialog.Title size="4" style={{ margin: 0 }}>
                Мои ревью
            </Dialog.Title>
            </Flex>
            
            <Flex align="center" gap="4"> 
            <Tooltip content="Обновить">
                <IconButton 
                variant="ghost" 
                size="2" 
                onClick={fetchPendingReviews}
                disabled={loading}
                >
                <FiRefreshCw size={16} className={loading ? 'rt-Spinner' : ''} />
                </IconButton>
            </Tooltip>
            <Dialog.Close disabled={loading}>
                <IconButton variant="ghost" size="2">
                <FiX />
                </IconButton>
            </Dialog.Close>
            </Flex>
        </Flex>

        {/* Бейдж под заголовком */}
        <Flex align="center" gap="2"  ml="7"> {/* mt-2 для отступа сверху, ml-5 для выравнивания с иконкой */}
            <Badge size="2" variant="soft" color="indigo">
            {pagination.total} {getDeclension(pagination.total, ['документ', 'документа', 'документов'])} {' в ожидании'}
            </Badge>
            {loading && <Spinner size="1" />}
        </Flex>
        </Flex>
          {/* Filters */}
          <Box p="4">
            <Card size="1">
              <Flex gap="3" align="center" wrap="wrap">
                <Box style={{ flex: 2, minWidth: '200px' }}>
                  <TextField.Root
                    placeholder="Поиск по названию документа"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  >
                    <TextField.Slot>
                      <FiSearch size={16} />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>
                
                <Box style={{ width: '150px' }}>
                  <Select.Root 
                    value={studyFilter || "all"} 
                    onValueChange={(value) => setStudyFilter(value === "all" ? "" : value)}
                  >
                    <Select.Trigger placeholder="Исследование" />
                    <Select.Content>
                      <Select.Item value="all">Все исследования</Select.Item>
                      <Select.Item value="1">Исследование 1</Select.Item>
                      <Select.Item value="2">Исследование 2</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>

                <Box style={{ width: '150px' }}>
                  <Select.Root 
                    value={siteFilter || "all"} 
                    onValueChange={(value) => setSiteFilter(value === "all" ? "" : value)}
                  >
                    <Select.Trigger placeholder="Центр" />
                    <Select.Content>
                      <Select.Item value="all">Все центры</Select.Item>
                      <Select.Item value="1">Центр 1</Select.Item>
                      <Select.Item value="2">Центр 2</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>

                <IconButton variant="ghost" color="gray">
                  <FiFilter size={16} />
                </IconButton>
              </Flex>
            </Card>
          </Box>

          <Separator size="4" />

          {/* Documents Table */}
          <Box p="4" style={{ flex: 1, overflow: 'auto', height: 'calc(90vh - 180px)' }}>
            {loading ? (
              <Flex justify="center" align="center" py="8" style={{ height: '100%' }}>
                <Spinner size="3" />
              </Flex>
            ) : documents.length === 0 ? (
              <Flex direction="column" align="center" gap="4" py="8">
                <Text size="4" weight="medium" color="gray">
                  Нет документов, ожидающих ревью
                </Text>
                <Text size="2" color="gray">
                  Когда кто-то отправит вам документ на утверждение, он появится здесь
                </Text>
              </Flex>
            ) : (
              <>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Документ</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Исследование/Центр</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Папка</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Отправитель</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Дата отправки</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell align="center">Действия</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {documents.map((doc) => (
                      <Table.Row key={doc.id}>
                        <Table.Cell>
                          <Flex direction="column" gap="1" maxWidth="370px">
                            <Text weight="bold" size="2">
                              {doc.document_name}
                            </Text>
                            <Flex gap="2" align="center">
                              <Badge size="1" variant="soft" color="blue">
                                Вер. {doc.document_number}
                              </Badge>
                              {doc.tmf_artifact && (
                                <Badge size="1" variant="soft" color="purple">
                                  {doc.tmf_artifact}
                                </Badge>
                              )}
                            </Flex>
                          </Flex>
                        </Table.Cell>

                        {/* Исследование */}
                        <Table.Cell>
                          {doc.submitter ? (
                            <Flex direction="column" gap="1">
                              <Flex align="center" gap="1">
                                <Text size="2">{getStudyProtocol(doc.study_id)}</Text>
                              </Flex>
                              <Text size="1" color="gray">{getSiteName(doc)}</Text>
                            </Flex>
                          ) : (
                            <Text size="2" color="gray">—</Text>
                          )}
                        </Table.Cell>

                        <Table.Cell>
                          <Flex align="center" gap="2" maxWidth="150px">
                            <FiFolder size={14} color="var(--gray-9)" />
                            <Text size="2">{doc.folder_name}</Text>
                          </Flex>
                        </Table.Cell>
                        
                        <Table.Cell>
                          {doc.submitter ? (
                            <Flex direction="column" gap="1">
                              <Flex align="center" gap="1">
                                <FiUser size={12} color="var(--gray-9)" />
                                <Text size="2">{doc.submitter.name}</Text>
                              </Flex>
                              <Text size="1" color="gray">{doc.submitter.email}</Text>
                            </Flex>
                          ) : (
                            <Text size="2" color="gray">—</Text>
                          )}
                        </Table.Cell>

                        <Table.Cell>
                          <Flex align="center" gap="1">
                            <FiCalendar size={12} color="var(--gray-9)" />
                            <Text size="2">{formatDate(String(doc.review_submitted_at))}</Text>
                          </Flex>
                        </Table.Cell>

                          {/* Buttons */}
                        <Table.Cell>
                          <Flex gap="2" justify="center" align="center">
                            <Tooltip content="Просмотр">
                              <IconButton 
                                size="1" 
                                color="blue"
                                variant="soft" 
                                //onClick={}
                              >
                                <FiEye size={14} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip content="Скачать">
                              <IconButton 
                                size="1"
                                color="blue"
                                variant="soft"
                                //onClick={}
                              >
                                <FiDownload size={14} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip content="Рассмотреть">
                              <IconButton 
                                size="1" 
                                color="green" 
                                variant="soft"
                                onClick={() => {updateContext({ selectedDocument: doc, isAcceptedForReview: true})}}
                              >
                                <FiCheckCircle size={14} />
                              </IconButton>
                            </Tooltip>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                  <Flex justify="between" align="center" pt="4">
                    <Text size="2" color="gray">
                      Показано {pagination.offset + 1}-
                      {Math.min(pagination.offset + pagination.limit, pagination.total)} из {pagination.total}
                    </Text>
                    <Flex gap="2">
                      <Button 
                        variant="soft" 
                        onClick={handlePrevPage}
                        disabled={pagination.offset === 0}
                      >
                        <FiChevronLeft />
                        Назад
                      </Button>
                      <Button 
                        variant="soft" 
                        onClick={handleNextPage}
                        disabled={!pagination.hasMore}
                      >
                        Вперед
                        <FiChevronRight />
                      </Button>
                    </Flex>
                  </Flex>
                )}
              </>
            )}
          </Box>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};