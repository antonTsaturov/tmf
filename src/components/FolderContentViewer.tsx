// components/FolderContentViewer.tsx
import { MainContext } from "@/wrappers/MainContext";
import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Document, DocumentAction } from "@/types/document";

import FilePreviewPanel from "./panels/FilePreviewPanel";
import NewVersionUploadPanel from "./panels/NewVersionDocumentPanel";
import SubmitToReviewPanel from "./panels/SubmitToReviewPanel";
import DocumentReviewPanel from "./panels/ReviewDocumentPanel";
import DocumentContextMenu from './DocumentContextMenu';
import DeleteDocumentPanel from "./panels/DeleteDocumentPanel";
import ArchiveDocumentPanel from "./panels/ArchiveDocumentPanel";
import DocumentStatusBadge from "./DocumentStatusBadge";
import { 
  Flex, 
  Text, 
  Box, 
  Spinner, 
  Badge,
  Popover,
  Button,
  Table,
  Section,
} from '@radix-ui/themes';
import { FileIcon } from 'react-file-icon';
import { 
  FiFilter, 
  FiChevronDown, 
  FiFolder, 
  FiInbox,
  FiAlertCircle, 
} from 'react-icons/fi';
import { FaRegFolderOpen } from "react-icons/fa";
import { ViewLevel } from "@/types/types";
import { useDragAndDrop } from '@/hooks/useDragAndDrop'; 
import { useAuth } from "@/wrappers/AuthProvider";
import DragAndDropOverlay from "./DragAndDropOverlay";
import { useUpload } from "@/wrappers/UploadContext";
import EditDocumentTitlePanel from "./panels/EditDocumentPanel";
import { DocumentLifeCycleStatus } from "@/types/document.status";
import RestoreDocumentPanel from "./panels/RestoreDocumentPanel";


interface FolderContentViewerProps {
  onDocumentSelect?: (document: Document) => void;
  onDocumentPreview?: (document: Document) => void;
}

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

const FolderContentViewer: React.FC<FolderContentViewerProps> = ({ onDocumentSelect, onDocumentPreview }) => {
  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, docWasDeleted, selectedFolder, selectedDocument, currentLevel } = context!;
  const { user } = useAuth();
  const upload = useUpload();
  
  const [documentsData, setDocumentsData] = useState<DocumentsInFolder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('all');

  useEffect(()=> {
    updateContext({isFolderContentLoading:isLoading})
  }, [isLoading])
  
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
          folderName: selectedFolder.name,
          size: files.reduce((total, f) => total + f.size, 0),
          customName: files.length === 1 
            ? files[0].name.replace(/\.[^/.]+$/, "")
            : `${files.length} файлов`,
          studyId: currentStudy.id,
          siteId: currentSite?.id || 'General Level Document',
          createdBy: user.id
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

  // Handle rename success - update document in folder list
  // const handleRenameSuccess = useCallback((updatedDoc: Document) => {
  //   updateSingleDocumentInState(updatedDoc);
  // }, [updateSingleDocumentInState]);

  // Обновляем документы в папке
  const handleUpdateFIleInFolder = (updatedDoc: Document) => {
    // обновляем только один документ
    updateSingleDocumentInState(updatedDoc);
    
    // Если документ был выделен, обновляем и выделение в контексте
    if (selectedDocument?.id === updatedDoc.id) {
      updateContext({ selectedDocument: updatedDoc });
    } else {
      updateContext({ selectedDocument: updatedDoc });
    }
  };

  // Обработчик успешной загрузки новой версии
  const handleNewVersionSuccess = useCallback((newVersion: any) => {
    if (!selectedDocument) return;

    const updatedDoc = selectedDocument;
    updatedDoc.document_number = newVersion;
    updateSingleDocumentInState(updatedDoc);

  }, []);  

  //console.log('selectedDocument: ', selectedDocument)
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
    if (!selectedFolder || !currentStudy) {
      setDocumentsData(null);
      return;
    }
    
    if (currentLevel === ViewLevel.SITE && !currentSite) {
      setDocumentsData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      const apiPath = currentSite
      ? `/api/documents?study_id=${currentStudy.id}&site_id=${currentSite.id}&folder_id=${selectedFolder.id}&include_deleted=true&include_archived=true`
      : `/api/documents?study_id=${currentStudy.id}&folder_id=${selectedFolder.id}&include_deleted=true&include_archived=true`

      const response = await fetch(apiPath);
      
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data: DocumentsInFolder = await response.json();
      setDocumentsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading documents');
      console.error('Error loading folder contents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFolder, currentStudy, currentSite]);

  useEffect(() => {
    loadFolderContents();
  }, [loadFolderContents]);

  useEffect(() => {
    if (uploadSuccess || docWasDeleted) {
      loadFolderContents();
      setUploadSuccess(false);
      updateContext({docWasDeleted: false});
    }
  }, [uploadSuccess, loadFolderContents, docWasDeleted, updateContext]);

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
      onDocumentSelect?.(null as any);
    }
  };

  const handleDocumentClick = (e: React.MouseEvent<HTMLDivElement>, doc: Document) => {
    e.stopPropagation();
    updateContext({ selectedDocument: doc });
    onDocumentSelect?.(doc);
  };

  const handleDocumentDoubleClick = (e: React.MouseEvent<HTMLDivElement>, doc: Document) => {
    e.stopPropagation();
    onDocumentPreview?.(doc);
  };

  const handleContextMenuAction = (action: DocumentAction, doc: Document) => {
    switch (action) {
      case DocumentAction.VIEW:
        updateContext({ isRightFrameOpen: true });
        break;
      case DocumentAction.SUBMIT_FOR_REVIEW:
        updateContext({ isSubmittingToReview: true });
        break;
      case DocumentAction.APPROVE:
      case DocumentAction.REJECT:
        updateContext({ isAcceptedForReview: true });
        break;
      default:
        console.log('Action not implemented in context menu:', action);
    }
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
    { value: 'all', label: 'Все документы', count: documentCounts.all },
    { value: 'active', label: 'Активные', count: documentCounts.active },
    { value: 'deleted', label: 'Удаленные', count: documentCounts.deleted },
    { value: 'archived', label: 'Архивированные', count: documentCounts.archived },
  ];

  if (!selectedFolder) {
    return (
      <Flex 
        align="center" 
        justify="center" 
        direction="column" 
        gap="4" 
        style={{ height: '100%', minHeight: '400px' }}
      >
        <FiFolder size={64} color="var(--gray-6)" />
      </Flex>
    );
  }

  if (isLoading) {
    return (
      <Flex align="center" justify="center" direction="column" gap="4" style={{ height: '100%', minHeight: '400px' }}>
        <Spinner size="3" />
        <Text size="3" color="gray">Загрузка содержимого...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex align="center" justify="center" direction="column" gap="4" style={{ height: '100%', minHeight: '400px' }}>
        <FiAlertCircle size={48} color="var(--red-9)" />
        <Text size="3" color="red">{error}</Text>
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

      {/* 3. Визуальный оверлей при перетаскивании файла */}
      <DragAndDropOverlay dragover={isDragOver} />

      {/* Заголовок с информацией о папке - фиксированный */}
      <Box style={{ flexShrink: 0 }}>
        <Section size="1" p="4" mb="0" ref={folderHeaderRef} style={{display: "flex",justifyContent:"space-between", alignItems:"start"}}>
          <Flex direction="column" gap="1">
            <Flex direction="row" gap="1">
              <FaRegFolderOpen size={24}/>
              <Text size="4" weight="bold" ml="2">{selectedFolder.name}</Text>
            </Flex>
            
            <Text size="1" color="gray">
              {filteredDocuments.length} / {documentsData?.count || 0} {getDocumentCountText(documentsData?.count || 0)}
            </Text>
          </Flex>

          {/* Фильтр документов */}
          {filteredDocuments.length !== 0 && <Popover.Root>
            <Popover.Trigger>
              <Button
                variant="ghost"
                size="2"
                color={`${ activeFilter !== 'all' ? 'indigo' : "gray"}`}
                >
                {activeFilter !== 'all' && <FiFilter />}
                {filterOptions.find(f => f.value === activeFilter)?.label}
                <FiChevronDown />
              </Button>
            </Popover.Trigger>
            <Popover.Content size="1">
              <Flex direction="column" gap="1">
                {filterOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={activeFilter === option.value ? 'solid' : 'ghost'}
                    onClick={() => {
                      setActiveFilter(option.value as ViewFilter);
                      updateContext({selectedDocument: null});
                    }}
                    style={{ justifyContent: 'space-between', width: '100%' }}
                  >
                    <Text>{option.label}</Text>
                    <Badge>{option.count}</Badge>
                  </Button>
                ))}
              </Flex>
            </Popover.Content>
          </Popover.Root>
          }
        </Section>
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
                borderBottom: 1
              }}
              ref={tableHeaderRef}
            >
              <Table.Row  style={{  color: 'gray', '--table-row-box-shadow': 'none' } as React.CSSProperties} >
                <Table.ColumnHeaderCell style={{ maxWidth: '400px', width: '40%' }}>Имя документа</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="20%">Статус</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="20%">Версия</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="20%">Создан</Table.ColumnHeaderCell>
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
          overflowY: 'auto'
        }}
      >
        {filteredDocuments.length === 0 ? (
          <Flex 
            align="center" 
            justify="center" 
            direction="column" 
            gap="4" 
            style={{ height: '300px' }}
          >
            <FiInbox size={48} color="var(--gray-6)" />
            <Text size="3" color="gray" align="center">
              {activeFilter === 'all' && 'В этой папке нет документов'}
              {activeFilter === 'active' && 'Нет активных документов'}
              {activeFilter === 'deleted' && 'Нет удаленных документов'}
              {activeFilter === 'archived' && 'Нет архивированных документов'}
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
                      onDoubleClick={(e) => handleDocumentDoubleClick(e, doc)}
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
                                {doc.document_name || doc.current_version?.document_name || doc.file_name || 'Без названия'}
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
        onUploadError={(error) => console.error('Upload error:', error)}
      />
      <NewVersionUploadPanel
        onUploadError={(error) => console.error('Upload error:', error)}
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
        onDocumentArchived={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
      <RestoreDocumentPanel
        onDocumentRestored={(updatedDoc) => handleUpdateFIleInFolder(updatedDoc)}
      />
    </Box>
  );};

const getDocumentCountText = (count: number): string => {
  if (count === 0) return 'документов';
  
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'документов';
  }
  
  if (lastDigit === 1) {
    return 'документ';
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'документа';
  }
  
  return 'документов';
};

export default FolderContentViewer;