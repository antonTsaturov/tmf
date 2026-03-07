// app/reviews/page.tsx
'use client';


import { useState, useEffect, useContext } from 'react';
import { 
  Container, 
  Flex, 
  Text, 
  Card, 
  Box, 
  Heading,
  Button,
  Badge,
  Table,
  TextField,
  Select,
  Spinner,
  Separator,
  IconButton,
  Tooltip,
  AlertDialog
} from '@radix-ui/themes';
import {
  FiSearch,
  FiFilter,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiDownload,
  FiClock,
  FiUser,
  FiFolder,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiX
} from 'react-icons/fi';
import { useAuth } from '@/wrappers/AuthProvider';
import { useNotification } from '@/wrappers/NotificationContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainContext } from '@/wrappers/MainContext';

import { useStudiesAndSites } from '@/hooks/useStudiesAndSites';
import DocumentReviewPanel from "@/components/panels/DocumentReviewPanel";
import { Document } from '@/types/document';
import UserMenu from '@/components/UserMenu';
import React from 'react';


interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}


export default function MyReviewsPage() {
  const { addNotification } = useNotification();
  const { context, updateContext } = useContext(MainContext)!;
  const { onDocumentUpdatedId, selectedDocument } = context;
  const { user } = useAuth()!;
  const { getStudyProtocol, getSiteName, loading: metadataLoading } = useStudiesAndSites();
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false
  });

  // Фильтры
  const [studyFilter, setStudyFilter] = useState(searchParams.get('study_id') || '');
  const [siteFilter, setSiteFilter] = useState(searchParams.get('site_id') || '');
  const [folderFilter, setFolderFilter] = useState(searchParams.get('folder_id') || '');
  
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка документов
  const fetchPendingReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });

      const response = await fetch(`/api/documents/reviews/pending?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending reviews');
      }

      const data = await response.json();
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
      addNotification('error', 'Ошибка при загрузке документов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, [pagination.offset, studyFilter, siteFilter, folderFilter]);

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

  useEffect(() => {
    setDocuments(prev => prev.filter(d => d.id !== onDocumentUpdatedId));
    // Очищаем onDocumentUpdatedId
    return () => updateContext({ onDocumentUpdatedId: undefined });
  }, [onDocumentUpdatedId]);  
  
  // Функция фильтрации
  const filterDocuments = (docs: Document[], query: string, studyId?: string, siteId?: string) => {
    return docs.filter(doc => {
      // Фильтр по поисковому запросу (название документа)
      const matchesSearch = !query.trim() || 
        doc.document_name.toLowerCase().includes(query.toLowerCase());
      
      // Фильтр по исследованию
      const matchesStudy = !studyId || studyId === "all" || 
        doc.study_id.toString() === studyId;
      
      // Фильтр по центру
      const matchesSite = !siteId || siteId === "all" || 
        doc.site_id.toString() === siteId;
      
      return matchesSearch && matchesStudy && matchesSite;
    });
  };

  const filteredDocuments = filterDocuments(documents, searchQuery);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Сбрасываем пагинацию при поиске (опционально)
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // Обновляем обработчики фильтров
  const handleStudyFilterChange = (value: string) => {
    setStudyFilter(value === "all" ? "" : value);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleSiteFilterChange = (value: string) => {
    setSiteFilter(value === "all" ? "" : value);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };
  
  // Обновляем количество для пагинации
  const displayedCount = filteredDocuments.length;
  const startIndex = pagination.offset;
  const endIndex = Math.min(startIndex + pagination.limit, displayedCount);
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);  

  if (!user) {
    return (
      <Container size="4" py="6">
        <Card>
          <Flex direction="column" align="center" gap="4" py="8">
            <Text color="gray">Необходимо авторизоваться</Text>
            <Button onClick={() => router.push('/login')}>Войти</Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  console.log(pagination)
  return (
    <div style={{ 
      height: 'calc(100vh - 64px)', // 64px — примерная высота вашего toolbar-header
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden' 
    }}>
      <header className="toolbar-header">
        <div className="toolbar-title"></div>
        <Link href="/home">
          <Button
            variant="solid"
            mr="3"
            >
            <Text align="center">
              eTMF
            </Text>
          </Button>
        </Link>        
        <UserMenu />
      </header>

      <DocumentReviewPanel
        // onSuccess={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
        // onReject={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
    
      <Box
        mt="8" 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'var(--space-4)',
          padding: '0 150px'
        }}
      >
        <Card size="2" variant="surface" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                  <Heading size="5" mb="1">Докумнты на рассмотрение</Heading>
                </Flex>
                
                <Flex align="center" gap="4" >
                  <TextField.Root
                    placeholder="Поиск по названию документа"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    style={{
                      minWidth: "400px"
                    }}
                  >
                    <TextField.Slot>
                      <FiSearch size={16} />
                    </TextField.Slot>
                  </TextField.Root>

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
                </Flex>
              </Flex>

            {/* Бейдж под заголовком */}
            <Flex  gap="2" justify="between" mt="4">
                <Badge size="2" variant="soft" color="indigo">
                {pagination.total} {getDeclension(pagination.total, ['документ', 'документа', 'документов'])} {' в ожидании'}
                </Badge>
                {loading && <Spinner size="1" />}
            
          
                {/* Filters */}
                <Flex  gap="3" align="center" wrap="wrap">

                  
                    <Select.Root 
                      value={studyFilter || "all"} 
                      onValueChange={handleStudyFilterChange}
                      size="1"
                    >
                      <Select.Trigger placeholder="Исследование" variant="ghost"/>
                      <Select.Content>
                        <Select.Item value="all">Все исследования</Select.Item>
                        <Select.Item value="1">Исследование 1</Select.Item>
                        <Select.Item value="2">Исследование 2</Select.Item>
                      </Select.Content>
                    </Select.Root>

                    <Select.Root 
                      value={siteFilter || "all"} 
                      onValueChange={handleSiteFilterChange}
                      size="1"
                    >
                      <Select.Trigger placeholder="Центр" variant="ghost"/>
                      <Select.Content>
                        <Select.Item value="all">Все центры</Select.Item>
                        <Select.Item value="1">Центр 1</Select.Item>
                        <Select.Item value="2">Центр 2</Select.Item>
                      </Select.Content>
                    </Select.Root>
                </Flex>
            </Flex>
          </Flex>



          <Box pt="4" pr="4" pl="4">
            <Table.Root
              variant="surface"
              style={{
                width: '100%',
                tableLayout: 'fixed',
                borderCollapse: 'separate',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}                      
              >
              {/* Фиксированный заголовок */}
              <Table.Header 
                style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 2, // Чтобы шапка была выше строк при скролле
                  backgroundColor: 'var(--color-panel-solid)', 
                  boxShadow: '0 1px 0 var(--gray-5)',
                  borderRadius: 0
                }}
              >
                <Table.Row>
                  <Table.ColumnHeaderCell style={{ width: '30%' }}>Документ</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell style={{ width: '15%' }}>Исследование/Центр</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell style={{ width: '15%' }}>Папка</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell style={{ width: '15%' }}>Отправитель</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell style={{ width: '15%' }}>Дата отправки</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell style={{ width: '10%' }} align="center">Действия</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
            </Table.Root>
          </Box>



          {/* Documents Table */}
          <Box pr="4" pl="4" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {loading && (
              <Flex justify="center" align="center" style={{ height: '100%' }}>
                <Spinner size="3" />
              </Flex>
            )}
            {documents.length === 0 && !loading && (
              <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100%' }}>
                <Text size="4" weight="medium" color="gray">
                  Нет документов, ожидающих ревью
                </Text>
                <Text size="2" color="gray">
                  Когда кто-то отправит вам документ на утверждение, он появится здесь
                </Text>
              </Flex>
            )}
            {paginatedDocuments.length > 0 && !loading && (
              <>
                  <Box
                    style={{
                      flex: 1,
                      overflow: 'auto',
                      minHeight: 0,
                      maxHeight: '100%',
                      position: 'relative'
                    }}
                  >                 
                    <Table.Root
                      variant="surface"
                      style={{
                        width: '100%',
                        tableLayout: 'fixed',
                        borderCollapse: 'separate'
                      }}                      
                      >
                      {/* Фиксированный заголовок */}
                      <Table.Header 
                        style={{ 
                          position: 'sticky', 
                          top: 0, 
                          zIndex: 2, // Чтобы шапка была выше строк при скролле
                          backgroundColor: 'var(--color-panel-solid)', 
                          boxShadow: '0 1px 0 var(--gray-5)'
                        }}
                      >
                        <Table.Row>
                        </Table.Row>
                      </Table.Header>

                      {/* Прокручиваемое тело */}
                      <Table.Body >
                        {paginatedDocuments.map((doc) => (
                          <Table.Row key={doc.id} style={{ 
                            cursor: 'pointer'
                          }}>
                            <Table.Cell style={{ width: '30%' }}>
                              <Flex direction="column" gap="1">
                                <Text weight="bold" size="2" style={{ wordBreak: 'break-word' }}>
                                  {doc.document_name}
                                </Text>
                                <Flex gap="2" align="center" wrap="wrap">
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

                            <Table.Cell style={{ width: '15%' }}>
                              {doc.submitter ? (
                                <Flex direction="column" gap="1">
                                  <Text size="2" style={{ wordBreak: 'break-word' }}>{getStudyProtocol(doc.study_id)}</Text>
                                  <Text size="1" color="gray" style={{ wordBreak: 'break-word' }}>{getSiteName(doc.site_id)}</Text>
                                </Flex>
                              ) : (
                                <Text size="2" color="gray">—</Text>
                              )}
                            </Table.Cell>

                            <Table.Cell style={{ width: '15%' }}>
                              <Flex align="center" gap="2">
                                <FiFolder size={14} color="var(--gray-9)" />
                                <Text size="2" style={{ wordBreak: 'break-word' }}>{doc.folder_name}</Text>
                              </Flex>
                            </Table.Cell>
                            
                            <Table.Cell style={{ width: '15%' }}>
                              {doc.submitter ? (
                                <Flex direction="column" gap="1">
                                  <Flex align="center" gap="1">
                                    <FiUser size={12} color="var(--gray-9)" />
                                    <Text size="2" style={{ wordBreak: 'break-word' }}>{doc.submitter.name}</Text>
                                  </Flex>
                                  <Text size="1" color="gray" style={{ wordBreak: 'break-word' }}>{doc.submitter.email}</Text>
                                </Flex>
                              ) : (
                                <Text size="2" color="gray">—</Text>
                              )}
                            </Table.Cell>

                            <Table.Cell style={{ width: '15%' }}>
                              <Flex align="center" gap="1">
                                <FiCalendar size={12} color="var(--gray-9)" />
                                <Text size="2">{formatDate(String(doc.review_submitted_at))}</Text>
                              </Flex>
                            </Table.Cell>

                            <Table.Cell style={{ width: '10%' }}>
                              <Flex gap="1" justify="center" align="center">
                                <Tooltip content="Просмотр">
                                  <IconButton size="1" color="blue" variant="soft">
                                    <FiEye size={14} />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip content="Скачать">
                                  <IconButton size="1" color="blue" variant="soft">
                                    <FiDownload size={14} />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip content="Рассмотреть">
                                  <IconButton 
                                    size="1" 
                                    color="green" 
                                    variant="soft"
                                    onClick={() => updateContext({ selectedDocument: doc, isAcceptedForReview: true })}
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
                  </Box> 

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                  <Flex justify="between" align="center" pt="4" style={{ flexShrink: 0 }}>
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
            {documents.length > 0 && displayedCount === 0 && !loading && (
              <Flex direction="column" align="center" justify="center" gap="4" style={{ height: '100%' }}>
                <Text size="4" weight="medium" color="gray">
                  Ничего не найдено
                </Text>
                <Text size="2" color="gray">
                  Попробуйте изменить параметры фильтрации
                </Text>
                <Button variant="soft" onClick={() => {
                  setSearchQuery('');
                  setStudyFilter('');
                  setSiteFilter('');
                }}>
                  Сбросить фильтры
                </Button>
              </Flex>
            )}
          </Box>
        </Card>
      </Box>
    </div>
  );
}