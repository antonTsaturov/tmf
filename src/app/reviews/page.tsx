// app/reviews/page.tsx
'use client';

import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { 
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
  IconButton,
  Tooltip,
  Tabs
} from '@radix-ui/themes';
import {
  FiSearch,
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
import { useAuth } from '@/wrappers/AuthProvider';
import { useNotification } from '@/wrappers/NotificationContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MainContext } from '@/wrappers/MainContext';

import { useStudiesAndSites } from '@/hooks/useStudiesAndSites';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import DocumentReviewPanel from "@/components/panels/ReviewDocumentPanel";
import { Document } from '@/types/document';
import UserMenu from '@/components/UserMenu';
import DocumentDetails from '@/components/DocumentDetails';
import PDFViewer from '@/components/PDFViewer';
import '../../styles/MyReviews.css';
import { FileIcon } from 'react-file-icon';
import { useFolderNameByMap } from '@/hooks/useFolderName';
import { logger } from '@/lib/utils/logger';


interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const VIEW_LEVELS = [
  { value: 'all', label: 'All documents' },
  { value: 'site', label: 'Site Level documents' },
  { value: 'general', label: 'General Level documents' },
  { value: 'country', label: 'Country Level documents' },
];

export default function MyReviewsPage() {
  const { getFolderNameFromStudiesMap } = useFolderNameByMap();
  const { addNotification } = useNotification();
  const { context, updateContext } = useContext(MainContext)!;
  const { onDocumentUpdatedId, selectedDocument, isRightFrameOpen } = context;
  const { user } = useAuth()!;
  const { getStudyProtocol, getSiteName, studies, sites } = useStudiesAndSites();
  const searchParams = useSearchParams();

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
  // const [folderFilter, setFolderFilter] = useState(searchParams.get('folder_id') || '');
  const [levelFilter, setLevelFilter] = useState(searchParams.get('folder_id') || '');
  
  const [searchQuery, setSearchQuery] = useState('');

  // State для хранения всех документов
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);

  // Загрузка всех документов один раз при монтировании
  const fetchAllPendingReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '1000', // Получаем все документы за один раз
        offset: '0'
      });

      const response = await fetch(`/api/documents/reviews/pending?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch pending reviews');
      }

      const data = await response.json();
      setAllDocuments(data.documents);
      // Устанавливаем общее количество для пагинации
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total
      }));
    } catch (error) {
      logger.error('Error fetching pending reviews', error);
      addNotification('error', 'Error loading documents');
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchAllPendingReviews();
  }, []);

  // Keep session alive: refresh token every 10 min and re-fetch documents
  useTokenRefresh({
    onRefreshSuccess: () => {
      fetchAllPendingReviews();
    },
  });

  // Обработчики пагинации
  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < filteredDocuments.length) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }));
    }
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
    setAllDocuments(prev => prev.filter(d => d.id !== onDocumentUpdatedId));
    // Очищаем onDocumentUpdatedId
    return () => updateContext({ onDocumentUpdatedId: undefined });
  }, [onDocumentUpdatedId]);  
  

 // Функция фильтрации
  const filterDocuments = (
    docs: Document[],
    query: string,
    studyId?: string,
    siteId?: string,
    levelFilter?: string
  ) => {
    return docs.filter(doc => {
      //  Фильтр по поисковому запросу
      const matchesSearch = !query.trim() || 
        doc.document_name.toLowerCase().includes(query.toLowerCase());
      
      //  Фильтр по исследованию
      const matchesStudy = !studyId || studyId === "all" || 
        doc.study_id.toString() === studyId;
      
      //  Фильтр по уровню (general, country, site, или все)
      const matchesLevel = (() => {
        const docLevel = doc.folder_id.split('-', 1)[0];

        if (!levelFilter || levelFilter === 'all') {
          return true;
        }

        if (levelFilter === 'general') {
          return docLevel === 'general' && doc.site_id === null;
        }

        if (levelFilter === 'country') {
          return docLevel === 'country' && doc.site_id === null;
        }

        if (levelFilter === 'site') {
          if (!siteId || siteId === "all") {
            return doc.site_id !== null;
          }
          return doc.site_id !== null && doc.site_id.toString() === siteId;
        }

        return true;
      })();
      
      return matchesSearch && matchesStudy && matchesLevel;
    });
  };

  const filteredDocuments = useMemo(() => {
    return filterDocuments(
      allDocuments,
      searchQuery,
      studyFilter,
      siteFilter,
      levelFilter // ← передаём docMode как параметр
    );
  }, [
    allDocuments,
    searchQuery,
    studyFilter,
    siteFilter,
    levelFilter // ← docMode в зависимостях: при изменении — пересчёт
  ]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Сбрасываем пагинацию при поиске (опционально)
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  // Oбработчики фильтров
  const handleStudyFilterChange = (value: string) => {
    setStudyFilter(value === "all" ? "" : value);
    setSiteFilter(""); // Сбросить фильтр центров при смене исследования
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleLevelFilterChange = (value: string) => {
    setLevelFilter(value === "all" ? "" : value);
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
      <Flex justify="center" align="center" minHeight="100vh" width="100%">
        <Card>
          <Flex direction="column" align="center" gap="4" py="8">
          </Flex>
        </Card>
      </Flex>
    );
  }

  return (
    <div className="main-box" style={{ 
      height: '95vh', // 95% доступной высоты экрана
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden' 
    }}>
      <header className="toolbar-header">
        <div className="toolbar-title"></div>
        <Link href="/home">
          <Button variant="solid" mr="3"
            onClick={()=> {
              // Закрыть боковой фрейм, чтобы он так же был закрыт при переходе на /home
              if (isRightFrameOpen) {
                updateContext({isRightFrameOpen: false})
              }
            }}  
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
        className='main-box'
        mt="5" 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          padding: '0 20px',
          gap: '20px',
        }}
        >
        <Card size="2" variant="surface" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <Flex direction="column"p="4" >
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
                      onClick={fetchAllPendingReviews}
                      disabled={loading}
                      >
                      <FiRefreshCw size={16} className={loading ? 'rt-Spinner' : ''} />
                      </IconButton>
                  </Tooltip>
                </Flex>
              </Flex>

            
            <Flex  gap="2" justify="between" mt="4">
              {/* Бейджи под заголовком */}
              <Flex gap="4" align="center" wrap="wrap">
                <Badge size="2" variant="soft" color="indigo">
                  {filteredDocuments.length} {getDeclension(filteredDocuments.length, ['документ найден', 'документа найдено', 'документов найдено'])}
                </Badge>
                
                {/* бейдж для общего количества */}
                <Badge size="2" variant="soft" color="gray">
                  Всего: {allDocuments.length} {getDeclension(allDocuments.length, ['документ', 'документа', 'документов'])} {'в ожидании'}
                </Badge>
              </Flex>
            
          
                {/* Filters */}
              <Flex  gap="6" align="center" wrap="wrap">
                  {/* Исследование */}
                  <Select.Root value={studyFilter || "all"} onValueChange={handleStudyFilterChange} size="1">
                    <Select.Trigger placeholder="Исследование" variant="ghost"/>
                    <Select.Content>
                      <Select.Item value="all">Все исследования</Select.Item>
                      {studies ? Array.from(studies.values()).map((study) => (
                        <Select.Item key={study.id} value={String(study.id)}>
                          {study.protocol}
                        </Select.Item>
                      )) : null}
                    </Select.Content>
                  </Select.Root>

                  {/* Уровень */}
                  <Select.Root value={levelFilter || "all"} onValueChange={handleLevelFilterChange} size="1">
                    <Select.Trigger placeholder="Уровень" variant="ghost"/>
                    <Select.Content>
                      {VIEW_LEVELS.map((level) => (
                        <Select.Item key={level.value} value={level.value}>
                          {level.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>

                  {/* Фильтр по конкретному центру */}
                  <Select.Root
                    value={siteFilter || "all"}
                    onValueChange={handleSiteFilterChange}
                    size="1"
                  >
                    <Select.Trigger
                      placeholder="Центр"
                      variant="ghost"
                      disabled={levelFilter === 'general' || levelFilter === 'country' }
                      className={`${isRightFrameOpen ? "select-fixed-width" : ''}`}
                    />
                    <Select.Content >
                      <Select.Item value="all" disabled={levelFilter === 'general'}>Все центры</Select.Item>
                      {sites ? Array.from(sites.values())
                        .filter((site) => !studyFilter || site.study_id.toString() === studyFilter)
                        .map((site) => (
                        <Select.Item key={site.id} value={String(site.id)} disabled={levelFilter === 'general' || levelFilter === 'country' }>
                          <span className="select-item-text" title={site.name}>
                            {site.name}
                          </span>
                        </Select.Item>
                      )) : null}
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
                  <Table.ColumnHeaderCell style={{ width: '15%' }}>{`Исследование ${levelFilter === 'site' ? "/ Центр" : ''}`}</Table.ColumnHeaderCell>
                  {!isRightFrameOpen && (<Table.ColumnHeaderCell style={{ width: '15%' }}>Папка</Table.ColumnHeaderCell>)}
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
            {allDocuments.length === 0 && !loading && (
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
                      borderBottom: '1px solid var(--gray-5)'
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
                      </Table.Header>

                      {/* Прокручиваемое тело */}
                      <Table.Body onContextMenu={(e) => e.preventDefault()}>
                        {paginatedDocuments.map((doc) => (
                          <Table.Row
                            className={`${'hoverable-row'} ${selectedDocument?.id === doc.id ? '--selected' : ''}`}
                            key={doc.id}
                            onClick={()=> {
                              
                              const study = studies.get(doc.study_id);
                              updateContext({
                                selectedDocument: doc,
                                isRightFrameOpen: true, 
                                currentStudy: study
                              })
                            }}
                            style={{ 
                              cursor: 'pointer',
                            }}
                          >
                            <Table.Cell style={{ width: '30%' }}>
                              <Flex direction="row" gap="3">
                              <Box style={{ width: 24, flexShrink: 0 }}>
                                {doc.file_type?.includes('pdf') ? (
                                  <FileIcon extension="pdf" labelColor="#D93831" type="acrobat" />
                                ) : (
                                  <FileIcon extension="txt" type="document" />
                                )}
                              </Box>
                              
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
                              </Flex>
                            </Table.Cell>

                            {/* Study Protocol and Site name  */}
                            <Table.Cell style={{ width: '15%' }}>
                              {doc.review_submitter ? (
                                <Flex direction="column" gap="1">
                                  <Text size="2" style={{ wordBreak: 'break-word' }}>
                                    {doc.study_id !== null ? getStudyProtocol(doc.study_id) : '—'}
                                  </Text>
                                  <Text size="1" color="gray" style={{ wordBreak: 'break-word' }}>
                                    {getSiteName(doc)}
                                  </Text>
                                </Flex>
                              ) : (
                                <Text size="2" color="gray">—</Text>
                              )}
                            </Table.Cell>

                            {/* Folder name */}
                            {!isRightFrameOpen && (<Table.Cell style={{ width: '15%' }}>
                              <Flex align="center" gap="2">
                                <FiFolder size={14} color="var(--gray-9)" />
                                <Text size="2" style={{  }}>{getFolderNameFromStudiesMap(studies, doc.study_id, doc.folder_id)}</Text>
                              </Flex>
                            </Table.Cell>)}
                            
                            {/* Submitter name and email */}
                            <Table.Cell style={{ width: '15%' }}>
                              {doc.review_submitter ? (
                                <Flex direction="column" gap="1">
                                  <Flex align="center" gap="1">
                                    <FiUser size={12} color="var(--gray-9)" />
                                    <Text size="2" style={{ wordBreak: 'break-word' }}>{doc.review_submitter.name}</Text>
                                  </Flex>
                                  <Text size="1" color="gray" style={{ wordBreak: 'break-word' }}>{doc.review_submitter.email}</Text>
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
                                  <IconButton
                                    size="1"
                                    color="blue"
                                    variant="soft"
                                    onClick={()=> {
                                      updateContext({selectedDocument: doc, isRightFrameOpen: true})
                                    }}
                                    >
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
                {filteredDocuments.length > pagination.limit && (
                  <Flex justify="between" align="center" pt="4" style={{ flexShrink: 0 }}>
                    <Text size="2" color="gray">
                      Показано {startIndex + 1}-
                      {endIndex} из {filteredDocuments.length}
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
                        disabled={pagination.offset + pagination.limit >= filteredDocuments.length}
                      >
                        Вперед
                        <FiChevronRight />
                      </Button>
                    </Flex>
                  </Flex>
                )}

              </>
            )}
            {allDocuments.length > 0 && displayedCount === 0 && !loading && (
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
                  //setFolderFilter('');
                }}>
                  Сбросить фильтры
                </Button>
              </Flex>
            )}
          </Box>
        </Card>
     

        {/* Right frame */}
        {isRightFrameOpen && (
          <div className="right-frame">

            <div className="right-frame-content">

              <button className="right-frame-close-button" onClick={()=> updateContext({isRightFrameOpen: false})}>
                <FiX />
              </button>

              <Tabs.Root defaultValue="view" className="right-frame-tabs-root">
                <Tabs.List>
                  <Tabs.Trigger value="view">Document preview</Tabs.Trigger>
                  <Tabs.Trigger value="tab2">Document details</Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="view" className="right-frame-tab-content">
                  {selectedDocument ? (
                    selectedDocument.is_deleted ? (
                      <div className="right-frame-placeholder">
                        <div className="placeholder-icon">🔒</div>
                        <div className="placeholder-text">
                          Документ "{selectedDocument.document_name}" был удален<br />
                          <span style={{fontSize: '13px', color: '#6c757d'}}>Просмотр недоступен</span>
                        </div>
                      </div>
                    ) : (
                      <PDFViewer onClose={() => updateContext({isRightFrameOpen: false})} />
                    )
                  ) : (
                    <div className="right-frame-placeholder">
                      <div className="placeholder-icon">📄</div>
                      <div className="placeholder-text">
                        Выберите документ для просмотра
                      </div>
                    </div>
                  )}                
                </Tabs.Content>
                <Tabs.Content value="tab2" className="right-frame-tab-content">
                  <DocumentDetails />
                </Tabs.Content>
              </Tabs.Root>
            </div>
          </div>
        )}
      </Box>   
    </div>
  );
}