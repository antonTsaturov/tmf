// components/FolderContentViewer.tsx
import { MainContext, MainContextProps } from "@/wrappers/MainContext";
import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Document, DocumentAction, SharedDocument } from "@/types/document";
import { useDocumentActionHandler } from '@/hooks/useDocumentActionHandler';
import { logger } from '@/lib/utils/logger';
import FilePreviewPanel from "./panels/FilePreviewPanel";
import NewVersionUploadPanel from "./panels/NewVersionDocumentPanel";
import SubmitToReviewPanel from "./panels/SubmitToReviewPanel";
import DocumentReviewPanel from "./panels/ReviewDocumentPanel";
import DocumentContextMenu from './DocumentContextMenu';
import DeleteDocumentPanel from "./panels/DeleteDocumentPanel";
import ArchiveDocumentPanel from "./panels/ArchiveDocumentPanel";
import DocumentStatusBadge from "./DocumentStatusBadge";
import { Flex, Text, Box, Spinner, Badge, Popover, Button, Table, } from '@radix-ui/themes';
import { FileIcon } from 'react-file-icon';
import { FiFilter, FiChevronDown, FiInbox, FiAlertCircle } from 'react-icons/fi';
import { FaRegFolderOpen } from "react-icons/fa";
import { StudySite, ViewLevel } from "@/types/types";
import { useDragAndDrop } from '@/hooks/useDragAndDrop'; 
import { useAuth } from "@/wrappers/AuthProvider";
import DragAndDropOverlay from "./ui/DragAndDropOverlay";
import { useUpload } from "@/wrappers/UploadContext";
import EditDocumentTitlePanel from "./panels/EditDocumentPanel";
import { DocumentLifeCycleStatus } from "@/types/document.status";
import RestoreDocumentPanel from "./panels/RestoreDocumentPanel";
import UnarchiveDocumentPanel from "./panels/UnarchiveDocumentPanel";
import { useI18n } from "@/hooks/useI18n";
// import { WelcomeScreen } from "./ui/WelcomeScreen";
// import { StudyMap } from "./ui/StudyMap";
// import { ViewLastDocuments } from "./ui/ViewLastDocuments";
import { AdminContext } from "@/wrappers/AdminContext";
import { getDocumentLevel } from "@/lib/utils/folder";
import { findNodeById } from "./FolderExplorer/utils/folderHelpers";
import { FileNode } from "./FolderExplorer";

interface DocumentFilters {
    study_id: number;
    site_id: string | number;
    folder_id: string;
}

interface DocumentsInFolder {
    count: number;
    documents: Document[];
    filters: DocumentFilters;
}

type ViewFilter = 'all' | 'active' | 'deleted' | 'archived';

const getSharedDocumentParams = (key: string) => {
  const stored = sessionStorage.getItem(key);
  if (stored) {
    return JSON.parse(stored);
  }
  return null;
};


const FolderContentViewer: React.FC = () => {
  const { t } = useI18n('');
  const { studies, loading: studiesLoading } = useContext(AdminContext)!;
  const { context, updateContext } = useContext(MainContext)!;
  const { 
    currentStudy, 
    currentSite, 
    docWasDeleted, 
    selectedFolder, 
    selectedDocument, 
    currentLevel, 
    currentCountry,
  } = context!;
  const { user } = useAuth();
  const upload = useUpload();
  const { handleAction } = useDocumentActionHandler();

  const [documentsData, setDocumentsData] = useState<DocumentsInFolder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('all');
  
  // Загрузка перетаскиванием
  const { isDragOver, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useDragAndDrop({
    disabled: !context,
    onDropFiles: (files) => {
      // Логика обработки файлов при дропе
      if (!selectedFolder || !currentStudy?.id || !user?.id) return;

      // Всегда создаем массив файлов
      const filesArray = Array.isArray(files) ? files : [files];
      
      if (filesArray.length === 0) return;

      if (filesArray.length > 0) {

        upload.setFilePreview({
          files,
          folderId: selectedFolder.id,
          //folderName: selectedFolder.name,
          size: files.reduce((total, f) => total + f.size, 0),
          customName: files.length === 1
            ? files[0].name.replace(/\.[^/.]+$/, "")
            : `${files.length} файлов`,
          studyId: currentStudy.id,
          siteId: currentSite?.id || 'General Level Document',
          createdBy: user.id,
          country: currentCountry || undefined
        });
      }
    }
  });

  // Ref для контейнера с документами
  const contentRef = useRef<HTMLDivElement>(null);
  const folderHeaderRef = useRef<HTMLTableSectionElement>(null);
  const documentListRef = useRef<HTMLDivElement>(null);
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);

  // функцию для точечного обновления документа в стейте
  const updateSingleDocumentInState = useCallback((updatedDoc: Document) => {
    setDocumentsData(prevData => {
      if (!prevData) return null;

      return {
        ...prevData,
        documents: prevData.documents.map(doc =>
          doc.id === updatedDoc.id ? { ...doc, ...updatedDoc } : doc
        )
      };
    });
  }, []);

  // Обновляем документы в папке
  const handleUpdateFIleInFolder = (updatedDoc: Document) => {
    // обновляем только один документ
    updateSingleDocumentInState(updatedDoc);
    
    // Если документ был выделен, обновляем и выделение в контексте
    if (String(selectedDocument?.id) === String(updatedDoc.id)) {
      updateContext({ selectedDocument: updatedDoc });
    }
  };

  // Обработчик успешной загрузки новой версии
  const handleNewVersionSuccess = useCallback((newVersionNumber: number) => {
    if (!selectedDocument) return;

    // Создаём копию документа с обновлённым номером версии
    const updatedDoc: Document = {
      ...selectedDocument,
      document_number: newVersionNumber,
    };

    // Обновляем документ в списке папки
    updateSingleDocumentInState(updatedDoc);

    // Обновляем выбранный документ в контексте
    updateContext({ selectedDocument: updatedDoc });

  }, [selectedDocument, updateSingleDocumentInState, updateContext]);  

  const handleAddNewDocument = useCallback((updatedDoc: Document | Document[]) => {
    setDocumentsData(prevData => {
      if (!prevData) return null;
      
      // Нормализуем входные данные: если пришёл массив — используем его, если один документ — оборачиваем в массив
      const docsToAdd = Array.isArray(updatedDoc) ? updatedDoc : [updatedDoc];
      
      return {
        ...prevData,
        count: prevData.count + docsToAdd.length,
        documents: [...docsToAdd, ...prevData.documents] // Добавляем новые документы в начало списка
      };
    });
  }, []);

  // Функция загрузки документов
  const loadFolderContents = useCallback(async () => {

    if (isLoading) {
      return;
    }
    
    if (!selectedFolder || !currentStudy) {
      setDocumentsData(null);
      return;
    }
    
    if (currentLevel === ViewLevel.SITE && !currentSite) {
      setDocumentsData(null);
      return;
    }

    if (currentLevel === ViewLevel.COUNTRY && !currentCountry) {
      setDocumentsData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let apiPath = `/api/documents?study_id=${currentStudy.id}&folder_id=${selectedFolder.id}&include_deleted=true&include_archived=true`;
      
      if (currentLevel === ViewLevel.SITE && currentSite) {
        apiPath += `&site_id=${currentSite.id}`;
      } else if (currentLevel === ViewLevel.COUNTRY && currentCountry) {
        apiPath += `&country=${encodeURIComponent(currentCountry)}`;
      }

      const response = await fetch(apiPath);
      
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data: DocumentsInFolder = await response.json();
      setDocumentsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading documents');
      logger.error('Error loading folder contents', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, currentStudy, currentSite, currentLevel, currentCountry]);
  
  // Загружаем документы
  useEffect(() => {
    loadFolderContents();
  }, [loadFolderContents]);

  useEffect(() => {
    if (uploadSuccess || docWasDeleted) {
      loadFolderContents();
      setUploadSuccess(false);
      updateContext({docWasDeleted: false});
    }
  }, [uploadSuccess, loadFolderContents, docWasDeleted, updateContext ]);

  // Обработка Document Link и Document Share Params, сохраненных в sessionStorage
  useEffect(()=> {
    updateContext({isFolderContentLoading:isLoading})


    if (studiesLoading || !documentsData || isLoading) {
      return;
    }    

    // Если в sessionStorage есть выделенный документ, берем его
    // selectedDocumentId может быть 
    // 1. если пользователь искал документ в поиске и выбрал его
    // 2. если пользователь открывал документ из Last Documents
    if (!isLoading) {
      const preSelectedDocumentId: string | null = sessionStorage.getItem('selectedDocumentId');
      if (preSelectedDocumentId) {
        const selectedDocument = documentsData?.documents.find(doc => String(doc.id) === preSelectedDocumentId);
        if (selectedDocument) {
          updateContext({ selectedDocument: selectedDocument });
        }
        sessionStorage.removeItem('selectedDocumentId');
      }
    }

    // Проверяем sessionStorage наличие sharedDocumentParams
    // sharedDocumentParams будет только если пользователь открывал ссылку на докумнет (shared document)
    const params: SharedDocument = getSharedDocumentParams('sharedDocumentParams');
    if (params && !isLoading) {
      
      const study = studies.find((s) => String(s.id) === params.study_id);
      const docLevel = getDocumentLevel(params.folder_id);
      const doc = documentsData?.documents.find((d) => String(d.id) === params.document_id);

      const folderNode = findNodeById([study?.folders_structure] as FileNode[], params.folder_id);
      const updates: Partial<MainContextProps> = {
        currentStudy: study,
        currentLevel: docLevel,
        selectedFolder: folderNode,
        selectedDocument: doc
      };
      
      // Определяем страну для Country Level и для General Level 
      // (General Level должен иметь страну по умолчанию)
      if (docLevel !== ViewLevel.SITE && params?.country) {
        updates.currentCountry = params?.country;
      }
      
      // Определяем site для Site Level
      if (params?.site_id && study?.sites) {
        const site = study?.sites.find((s) => String(s.id) === params.site_id);

        updates.currentCountry = site?.country;
        updates.countryFilter = study.countries;
        updates.currentSite = site as StudySite;
      }
      updateContext(updates);
      sessionStorage.removeItem('sharedDocumentParams');
    }

  }, [isLoading, studiesLoading, documentsData]);

  const filteredDocuments = useMemo(() => {
    if (!documentsData?.documents) return [];
    
    const allDocs = documentsData.documents;

    switch (activeFilter) {
      case 'active':
        return allDocs.filter(doc => !doc.is_deleted && !doc.is_archived);
      case 'deleted':
        return allDocs.filter(doc => doc.is_deleted);
      case 'archived':
        return allDocs.filter(doc => doc.is_archived && !doc.is_deleted);
      case 'all':
      default:
        return allDocs;
    }
    
  }, [documentsData, activeFilter]);

  const documentCounts = useMemo(() => {
    if (!documentsData?.documents) {
      return { active: 0, deleted: 0, archived: 0, all: 0 };
    }
    
    const allDocs = documentsData.documents;
    
    return {
      active: allDocs.filter(doc => !doc.is_deleted && !doc.is_archived).length,
      deleted: allDocs.filter(doc => doc.is_deleted).length,
      archived: allDocs.filter(doc => doc.is_archived && !doc.is_deleted).length,
      all: allDocs.length
    };
  }, [documentsData]);

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // 1. Проверяем клик по строке таблицы
    const isRowClick = target.closest('.rt-TableRow');
    
    // 2. Проверяем клик по элементам управления и модальным окнам
    // Добавляем проверку на роли 'dialog', 'menu' и специфичные классы Radix
    const isActionClick = 
      target.closest('button') || 
      target.closest('.rt-PopoverContent') ||
      target.closest('.rt-Heading') ||
      target.closest('.rt-Text') ||
      target.closest('.rt-BaseDialogContent') ||
      target.closest('.rt-DialogContent') ||      // Контент модального окна
      target.closest('.rt-DialogOverlay') ||      // Задний фон модального окна
      target.closest('[role="dialog"]') ||        // Универсальная проверка по роли
      target.closest('[role="menu"]');            // Для контекстных меню

    // Если клик не по строке и не по элементам интерфейса/модалкам — снимаем выделение
    if (!isRowClick && !isActionClick) {
      updateContext({ selectedDocument: null });
      //onDocumentSelect?.(null as any);
    }
  };

  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>, doc: Document) => {
    e.stopPropagation();
    updateContext({ selectedDocument: doc });
  };

  const handleDocumentDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleContextMenuAction = (action: DocumentAction, doc: Document) => {
    handleAction(action, doc);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterOptions = [
    { value: 'all', label: t('folderContentViewer.filter.all'), count: documentCounts.all },
    { value: 'active', label: t('folderContentViewer.filter.active'), count: documentCounts.active },
    { value: 'deleted', label: t('folderContentViewer.filter.deleted'), count: documentCounts.deleted },
    { value: 'archived', label: t('folderContentViewer.filter.archived'), count: documentCounts.archived },
  ];


  if (isLoading) {
    return (
      <>
        <Flex align="center" justify="center" direction="column" gap="4" style={{ height: '100%', minHeight: '400px' }}>
          <Spinner size="3" />
          <Text size="3" color="gray">{t('folderContentViewer.loading')}</Text>
        </Flex>
      </>
    );
  }

  if (error) {
    return (
      <Flex align="center" justify="center" direction="column" gap="4" style={{ height: '100%', minHeight: '400px' }}>
        <FiAlertCircle size={48} color="var(--red-9)" />
        <Text size="3" color="red">{t('folderContentViewer.errorLoading')}</Text>
        <Text size="2" color="gray">{error}</Text>
      </Flex>
    );
  }

  return (
    <Box 
      ref={contentRef} 
      onClick={handleContentClick}
      onDragEnterCapture={handleDragEnter}
      onDragLeaveCapture={handleDragLeave}
      onDragOverCapture={handleDragOver}
      onDropCapture={handleDrop}      
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        borderBottomLeftRadius: '6px',
        borderBottomRightRadius: '6px',
        position: 'relative'
      }}
    >

      {/* Визуальный оверлей при перетаскивании файла */}
      <DragAndDropOverlay dragover={isDragOver} />

      {/* Заголовок с информацией о папке - фиксированный */}
      <Box style={{ flexShrink: 0 }}>
        <Flex  p="4" mb="0" ref={folderHeaderRef} width="100%">
          <Flex direction="column" gap="1" width="100%">
            <Flex direction="row" gap="1">
              <FaRegFolderOpen size={24}/>
              <Text size="4" weight="bold" ml="2" style={{ textTransform: 'uppercase' }}>{selectedFolder?.name}</Text>
            </Flex>
            
            <Flex direction="row" gap="1" align="center"  justify="between">
            <Text size="1" color="gray">
              {t('folderContentViewer.documentsSummary', {
                shown: filteredDocuments.length,
                total: documentsData?.count || 0
              })}
            </Text>

            {/* Фильтр документов */}
            {filteredDocuments && (
              <Popover.Root>
                <Popover.Trigger>
                  <Button
                    variant="ghost" 
                    color={activeFilter !== 'all' ? "indigo" : "gray"}
                    size="1"
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <Flex align="center" gap="2">
                      {activeFilter !== 'all' ? <FiFilter /> : null}
                      <Text >
                        {filterOptions.find(f => f.value === activeFilter)?.label}
                      </Text>
                      <FiChevronDown style={{ opacity: 0.6 }} />
                    </Flex>
                  </Button>
                </Popover.Trigger>

                <Popover.Content size="1" width="200px">
                  <Flex direction="column" gap="1">
                    {filterOptions.map(option => {
                      const isSelected = activeFilter === option.value;
                      return (
                        <Button
                          key={option.value}
                          variant={isSelected ? 'ghost' : 'ghost'}
                          color={isSelected ? 'indigo' : 'gray'}
                          onClick={() => {
                            setActiveFilter(option.value as ViewFilter);
                            updateContext({ selectedDocument: null });
                          }}
                          style={{ 
                            justifyContent: 'flex-start', 
                            width: '100%',
                            paddingLeft: '8px',
                            paddingRight: '8px',
                            marginBottom: '1px'
                          }}
                        >
                          <Flex align="center" justify="between" width="100%">
                            <Flex align="center" gap="2">
                              {/* Небольшой визуальный маркер выбранного пункта */}
                              <Box style={{ width: 6, height: 6, borderRadius: '50%', 
                                backgroundColor: isSelected ? 'var(--indigo-9)' : 'transparent' }} 
                              />
                              <Text size="1" weight={isSelected ? "bold" : "regular"}>
                                {option.label}
                              </Text>
                            </Flex>
                            <Badge 
                              variant={isSelected ? "solid" : "surface"} 
                              color={isSelected ? "indigo" : "gray"}
                            >
                              {option.count}
                            </Badge>
                          </Flex>
                        </Button>
                      );
                    })}
                  </Flex>
                </Popover.Content>
              </Popover.Root>
            )}
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {/* Заголовок таблицы - фиксированный */}
      {filteredDocuments.length > 0 && (
          <Table.Root 
            variant="surface" 
            size="2" 
            style={{ 
              borderRadius: 0,
              borderTopWidth: 1,
              borderLeftWidth: 0,
              borderRightWidth: 0,
              borderBottom: 1,
              '--table-border-radius': '0px',
              '--table-row-box-shadow': 'none'
            } as React.CSSProperties}
          >
            <Table.Header 
              onContextMenu={(e) => e.preventDefault()}
              style={{ 
                borderRadius: 0,
                borderBottom: 1,
                maxHeight: '20px',
              }}
              ref={tableHeaderRef}
            >
              <Table.Row  style={{  color: 'gray', '--table-row-box-shadow': 'none' } as React.CSSProperties} >
                {/* Table headers */}
                <Table.ColumnHeaderCell style={{ maxWidth: '400px', width: '40%' }}>
                  {t('folderContentViewer.table.documentName')}
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="20%">
                  {t('folderContentViewer.table.status')}
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="20%">
                  {t('folderContentViewer.table.version')}
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="20%">
                  {t('folderContentViewer.table.created')}
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
          </Table.Root>
      )}

      {/* Прокручиваемая область с документами */}
      <Box 
        ref={documentListRef}
        style={{ 
          flex: 1, 
          minHeight: 0, 
          overflowY: 'auto',
          backgroundColor: 'white'
        }}
      >
        {filteredDocuments.length === 0 ? (
          <Flex 
            align="center" 
            justify="center" 
            direction="column" 
            gap="4" 
            height="100%"
          >
            <FiInbox size={48} color="var(--gray-6)" />
            <Text size="3" color="gray" align="center">
              {activeFilter === 'all' && t('folderContentViewer.emptyStates.all')}
              {activeFilter === 'active' && t('folderContentViewer.emptyStates.active')}
              {activeFilter === 'deleted' && t('folderContentViewer.emptyStates.deleted')}
              {activeFilter === 'archived' && t('folderContentViewer.emptyStates.archived')}
            </Text>
          </Flex>
        ) : (
          <Box className="table-container">
            <Table.Root variant="surface" size="2" style={{ borderRadius: 0, borderRightWidth: 0, borderLeftWidth: 0 }}>
              <Table.Body onContextMenu={(e) => e.preventDefault()}>
                {filteredDocuments.map((doc) => (
                  <DocumentContextMenu
                    document={doc}
                    key={doc.id}
                    onAction={(e) => handleContextMenuAction(e, doc)}
                  >
                    <Table.Row 
                      key={doc.id}
                      onClick={(e) => handleDocumentClick(e, doc)}
                      onDoubleClick={(e) => handleDocumentDoubleClick(e)}
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedDocument?.id === doc.id ? 'var(--blue-3)' : undefined,
                        transition: 'background-color 0.2s',
                        verticalAlign: 'middle'
                      }}
                      className={selectedDocument?.id === doc.id ? 'rt-TableRow--selected' : ''}
                    >
                      {/* Имя документа */}
                      <Table.Cell style={{ maxWidth: '400px', width: '40%' }}>
                        <Flex align="center" gap="2" style={{ width: '100%' }}>
                          <Box style={{ width: 24, flexShrink: 0 }}>
                            {doc.file_type?.includes('pdf') ? (
                              <FileIcon extension="pdf" labelColor="#D93831" type="acrobat" />
                            ) : (
                              <FileIcon extension="txt" type="document" />
                            )}
                          </Box>
                          <Flex 
                            direction="column" 
                            gap="1" 
                            style={{ 
                              minWidth: 0,
                              flex: 1,
                              overflow: 'hidden'
                            }}
                          >
                              <Text 
                                size="2" 
                                weight="medium" 
                                style={{ 
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  maxWidth: '100%',
                                  lineHeight: '1.4'
                                }}
                              >
                                {doc.document_name || doc.current_version?.document_name || doc.file_name || t('folderContentViewer.document.untitled')}
                              </Text>
                            {doc.tmf_artifact && (
                              <Badge 
                                size="1" 
                                variant="soft" 
                                color="blue" 
                                style={{ 
                                  width: 'fit-content',
                                  maxWidth: '100%'
                                }}
                              >
                                <Text 
                                  style={{ 
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    display: 'block'
                                  }}
                                >
                                  {doc.tmf_artifact}
                                </Text>
                              </Badge>
                            )}
                          </Flex>
                        </Flex>
                      </Table.Cell>
                      
                      {/* Статус */}
                      <Table.Cell style={{  width: '20%'}}>
                        <DocumentStatusBadge
                          status={
                            doc.is_archived
                            ? DocumentLifeCycleStatus.ARCHIVED 
                            : doc.is_deleted
                            ? DocumentLifeCycleStatus.DELETED 
                            : doc.status
                          }
                        />
                      </Table.Cell>

                      {/* Версия */}
                      <Table.Cell style={{  width: '20%'}}>
                        <Text size="2">{doc?.document_number || '0'}</Text>
                      </Table.Cell>

                      {/* Дата создания */}
                      <Table.Cell >
                        <Flex direction="column">
                          <Text size="2">{formatDate(doc.created_at)}</Text>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  </DocumentContextMenu>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* Панели  */}
      <EditDocumentTitlePanel
        onRenameSuccess={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
      <FilePreviewPanel
        onUploadSuccess={(updatedDoc) => handleAddNewDocument(updatedDoc)}
        onUploadError={(error) => logger.error('File upload error', error, { 
          folderId: selectedFolder?.id,
          studyId: currentStudy?.id 
        })}
      />
      <NewVersionUploadPanel
        onUploadError={(error) => logger.error('New version upload error', error, {
          documentId: selectedDocument?.id
        })}
        onSuccess={(version) => handleNewVersionSuccess(version)}
      />
      <SubmitToReviewPanel
        studyId={currentStudy?.id || 0}
        siteId={currentSite?.id || ''}
        onSuccess={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
      <DocumentReviewPanel
        onSuccess={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
        onReject={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
      <DeleteDocumentPanel />
      <ArchiveDocumentPanel
        onDocumentArchived={() => loadFolderContents()}
      />
      <UnarchiveDocumentPanel
        onDocumentUnarchived={() => loadFolderContents()}
      />
      <RestoreDocumentPanel
        onDocumentRestored={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
    </Box>
  );};

export default FolderContentViewer;