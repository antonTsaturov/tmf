// components/FilePreviewPanel.tsx
/*
* Панель загрузки нового документа. Открывается при нажатии на кнопку "Создать
" а также при перетаскивании документа в область просмотра содержмого папки
*/

import React, { useState, useEffect, useContext } from 'react';
import { 
  Dialog, 
  Flex, 
  Text, 
  Button, 
  Box, 
  Card,
  Badge,
  TextField,
  Spinner,
  IconButton,
  Separator,
  Tooltip,
  DataList,
  ScrollArea,
  Checkbox,
  Progress,
  Tabs
} from '@radix-ui/themes';
import { 
  FiX, 
  FiUpload, 
  FiEdit2, 
  FiSave,
  FiFile,
  FiFileText,
  FiFolder,
  FiHardDrive,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { useUpload } from '@/wrappers/UploadContext';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { useNotification } from '@/wrappers/NotificationContext';
import { FaClinicMedical, FaRegBuilding } from 'react-icons/fa';
import { Document } from '@/types/document';
import { ViewLevel } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';

interface FilePreviewPanelProps {
  onUploadSuccess?: (documents: Document | Document[]) => void;
  onUploadError?: (error: string) => void;
}

interface FileItem {
  file: File;
  
  customName: string;
  isEditing: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  document?: Document;
}

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ 
  onUploadSuccess, 
  onUploadError 
}) => {
  const { addNotification } = useNotification();
  const upload = useUpload();
  const { uploadMultipleFiles, isUploading: hookIsUploading } = useDocumentUpload();
  const { context } = useContext(MainContext)!;
  const { currentStudy, currentSite, currentLevel } = context;

  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'details'>('list');

  // Инициализация fileItems из контекста
  useEffect(() => {
    if (upload.filePreview?.files) {
      const files = upload.filePreview.files;
      setFileItems(files.map(file => ({
        file,
        customName: file.name.replace(/\.[^/.]+$/, ''),
        isEditing: false,
        status: 'pending'
      })));
    }
  }, [upload.filePreview]);

  // Синхронизация состояния загрузки с контекстом
  useEffect(() => {
    upload.setUploading(hookIsUploading);
  }, [hookIsUploading]);

  if (!upload.isPreviewOpen || !upload.filePreview) return null;

  // Форматирование размера файла
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Получить расширение файла
  const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || 'unknown';
  };

  // Получить цвет для расширения
  const getFileColor = (extension: string): string => {
    switch (extension) {
      case 'pdf': return 'red';
      case 'txt': return 'blue';
      case 'doc': case 'docx': return 'blue';
      case 'xls': case 'xlsx': return 'green';
      default: return 'gray';
    }
  };

  // Получить иконку статуса
  const getStatusIcon = (status: FileItem['status']) => {
    switch (status) {
      case 'success':
        return <FiCheckCircle size={16} color="var(--green-9)" />;
      case 'error':
        return <FiAlertCircle size={16} color="var(--red-9)" />;
      case 'uploading':
        return <Spinner size="1" />;
      default:
        return null;
    }
  };

  // Обработчики выбора файлов
  const toggleSelectAll = () => {
    if (selectedIndices.size === fileItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(fileItems.map((_, index) => index)));
    }
  };

  const toggleFileSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  // Редактирование названия файла
  const startEditing = (index: number) => {
    setFileItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isEditing: true } : item
    ));
  };

  const saveName = (index: number, newName: string) => {
    if (newName.trim()) {
      setFileItems(prev => prev.map((item, i) => 
        i === index ? { ...item, customName: newName.trim(), isEditing: false } : item
      ));
    }
  };

  const cancelEditing = (index: number) => {
    setFileItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isEditing: false } : item
    ));
  };

  const handleNameChange = (index: number, value: string) => {
    setFileItems(prev => prev.map((item, i) => 
      i === index ? { ...item, customName: value } : item
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveName(index, fileItems[index].customName);
    }
    if (e.key === 'Escape') {
      cancelEditing(index);
    }
  };

  // Удаление выбранных файлов
  const removeSelectedFiles = () => {
    const newFileItems = fileItems.filter((_, index) => !selectedIndices.has(index));
    setFileItems(newFileItems);
    setSelectedIndices(new Set());

    // Обновляем контекст
    const newFiles = newFileItems.map(item => item.file);
    if (newFiles.length === 0) {
      upload.clearFilePreview();
    } else {
      upload.setFilePreview({
        ...upload.filePreview!,
        files: newFiles,
        size: newFiles.reduce((total, file) => total + file.size, 0),
        customName: newFiles.length === 1 
          ? newFileItems[0].customName
          : `${newFiles.length} файлов`
      });
    }
  };

  // Загрузка выбранных файлов
  const handleUploadSelected = async () => {
    const itemsToUpload = fileItems.filter((_, index) => selectedIndices.has(index));

    if (itemsToUpload.length === 0) {
      addNotification('error', 'Выберите файлы для загрузки');
      return;
    }

    await handleUpload(itemsToUpload);
  };

  // Загрузка всех файлов
  const handleUploadAll = async () => {
    await handleUpload(fileItems);
  };

  // Общая функция загрузки
  const handleUpload = async (items: FileItem[]) => {
    try {
      if (!currentStudy?.id) {
        const errorMsg = 'Ошибка: не выбрано исследование';
        addNotification('error', errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      if (currentLevel === ViewLevel.SITE && !currentSite?.id) {
        const errorMsg = 'Ошибка: не указан центр';
        addNotification('error', errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      // Обновляем статусы загружаемых файлов
      setFileItems(prev => 
        prev.map(item => 
          items.includes(item) 
            ? { ...item, status: 'uploading', progress: 0 }
            : item
        )
      );

      // Передаем массив FileItem[] в uploadMultipleFiles
      const result = await uploadMultipleFiles(items, {
        studyId: String(currentStudy?.id),
        siteId: String(currentSite?.id),
        folderId: upload.filePreview!.folderId,
        //folderName: upload.filePreview!.folderName,
        createdBy: String(upload.filePreview!.createdBy),
        tmfZone: null,
        tmfArtifact: null,
        country: upload.filePreview!.country
      }, (index, progress, document) => {
        // 🎯 Обновляем прогресс конкретного файла в состоянии
        setFileItems(prev => prev.map((item, i) => {
          if (i === index) {
            const update: Partial<FileItem> = { 
              progress,
              status: progress === 100 ? 'success' : 'uploading'
            };
            if (document) {
              update.document = document;
              update.customName = document.document_name || item.customName;
            }
            return { ...item, ...update };
          }
          return item;
        }));
      });

      if (result.success && result.documents) {
        const documents = result.documents;
        
        // Обновляем статусы успешно загруженных файлов
        setFileItems(prev => 
          prev.map((item, index) => {
            // Приоритет: сопоставление по индексу (порядок сохраняется при последовательной загрузке)
            if (documents[index]) {
              const uploadedDoc = documents[index];
              return { 
                ...item, 
                status: 'success' as const, 
                document: uploadedDoc,
                customName: uploadedDoc.document_name || item.customName
              };
            }
            
            // Фолбэк: сопоставление по имени файла
            const uploadedDoc = documents.find(
              (doc: Document) => doc.file_name === item.file.name
            );
            
            return uploadedDoc
              ? { 
                  ...item, 
                  status: 'success' as const, 
                  document: uploadedDoc,
                  customName: uploadedDoc.document_name || item.customName
                }
              : item;
          })
        );

        // Показываем уведомления
        documents.forEach((doc: Document) => {
          addNotification('success', `Документ "${doc.document_name}" успешно загружен`);
        });

        // Вызываем onUploadSuccess с правильной типизацией
        if (documents.length === 1) {
          onUploadSuccess?.(documents[0]);
        } else {
          onUploadSuccess?.(documents);
        }

        // Обновляем счётчик
        upload.setUploadedCount((prev: number) => prev + documents.length);

        // ✅ ИСПРАВЛЕНИЕ: Проверяем успешность по количеству документов, а не по старому состоянию
        // Так как мы в блоке success и documents.length === fileItems.length, считаем все успешными
        if (documents.length === fileItems.length) {
          setTimeout(() => {
            upload.clearFilePreview();
          }, 1000);
        }
      } else {
        const errorMsg = result.error || 'Неизвестная ошибка при загрузке';
        
        setFileItems(prev => 
          prev.map(item => 
            items.includes(item)
              ? { ...item, status: 'error', error: errorMsg }
              : item
          )
        );

        addNotification('error', `Ошибка при загрузке файлов: ${errorMsg}`);
        onUploadError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      
      setFileItems(prev => 
        prev.map(item => 
          items.includes(item)
            ? { ...item, status: 'error', error: errorMsg }
            : item
        )
      );

      addNotification('error', `Ошибка при загрузке: ${errorMsg}`);
      onUploadError?.(errorMsg);
    }
  };

  const handleCancel = () => {
    upload.clearFilePreview();
  };

  const totalFiles = fileItems.length;
  const totalSize = fileItems.reduce((acc, item) => acc + item.file.size, 0);
  const pendingCount = fileItems.filter(item => item.status === 'pending').length;
  const successCount = fileItems.filter(item => item.status === 'success').length;
  const errorCount = fileItems.filter(item => item.status === 'error').length;

  return (
    <Dialog.Root open={upload.isPreviewOpen} onOpenChange={(open) => !open && !upload.isUploading && handleCancel()}>
      <Dialog.Content style={{ maxWidth: 700, padding: 0 }} aria-describedby={undefined}>
        {/* Header */}
        <Flex 
          justify="between" 
          align="center" 
          p="4" 
          style={{ borderBottom: '1px solid var(--gray-5)' }}
        >
          <Flex align="center" gap="2">
            <Box className="rt-AvatarRoot" style={{ width: 32, height: 32 }}>
              <FiFile size={20} color="var(--blue-9)" />
            </Box>
            <Dialog.Title size="4" style={{ margin: 0 }}>
              {totalFiles > 1 ? `Загрузка файлов (${totalFiles})` : 'Загрузка документа'}
            </Dialog.Title>
          </Flex>
          <Dialog.Close disabled={upload.isUploading}>
            <IconButton variant="ghost" size="2" disabled={upload.isUploading}>
              <FiX />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value as 'list' | 'details')}>
          <Tabs.List>
            <Tabs.Trigger value="list">Список файлов</Tabs.Trigger>
            <Tabs.Trigger value="details">Информация</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        {/* Progress Summary */}
        {(successCount > 0 || errorCount > 0) && (
          <Box p="4" style={{ backgroundColor: 'var(--gray-2)' }}>
            <Flex gap="4" wrap="wrap">
              <Badge size="2" color="green" variant="soft">
                Загружено: {successCount}
              </Badge>
              <Badge size="2" color="gray" variant="soft">
                Ожидает: {pendingCount}
              </Badge>
              {errorCount > 0 && (
                <Badge size="2" color="red" variant="soft">
                  Ошибок: {errorCount}
                </Badge>
              )}
            </Flex>
          </Box>
        )}

        {/* Destination Info */}
        <Box p="4">
          <Card size="1">
            <Flex gap="4" wrap="wrap">
              <Flex align="center" gap="2">
                <FaClinicMedical size={14} color="var(--gray-9)" />
                <Text size="2">{currentStudy?.protocol || currentStudy?.title || 'Исследование'}</Text>
              </Flex>
              {currentLevel === ViewLevel.SITE && currentSite && (
                <Flex align="center" gap="2">
                  <FaRegBuilding size={14} color="var(--gray-9)" />
                  <Text size="2">{currentSite.name}</Text>
                </Flex>
              )}
              <Flex align="center" gap="2">
                <FiFolder size={14} color="var(--gray-9)" />
                {/* <Badge size="1" variant="soft" color="blue">
                  {upload.filePreview?.folderName}
                </Badge> */}
              </Flex>
            </Flex>
          </Card>
        </Box>

        <Separator size="4" />

        {/* Tab Content */}
        {activeTab === 'list' ? (
          <>
            {/* File List Header */}
            <Flex justify="between" align="center" px="4" py="2">
              <Flex align="center" gap="3">
                <Checkbox 
                  checked={selectedIndices.size === fileItems.length && fileItems.length > 0}
                  onCheckedChange={toggleSelectAll}
                  disabled={upload.isUploading}
                />
                <Text size="2" weight="medium">Выбрать все</Text>
              </Flex>
              <Flex gap="2">
                {selectedIndices.size > 0 && (
                  <Button 
                    size="1" 
                    color="red" 
                    variant="soft"
                    onClick={removeSelectedFiles}
                    disabled={upload.isUploading}
                  >
                    <FiTrash2 size={14} />
                    Удалить выбранные ({selectedIndices.size})
                  </Button>
                )}
                <IconButton 
                  variant="ghost" 
                  size="1"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </IconButton>
              </Flex>
            </Flex>

            {/* File List */}
            {expanded && (
              <ScrollArea style={{ maxHeight: 400 }}>
                <Box px="4" pb="4">
                  {fileItems.map((item, index) => {
                    const ext = getFileExtension(item.file.name);
                    const color = getFileColor(ext);
                    const isSelected = selectedIndices.has(index);
                    
                    return (
                      <Card 
                        key={index} 
                        size="1" 
                        variant="surface" 
                        mb="2"
                        style={{ 
                          opacity: item.status === 'success' ? 0.8 : 1,
                          border: isSelected ? '2px solid var(--blue-8)' : undefined,
                          position: 'relative'
                        }}
                      >
                        <Flex gap="3" align="start">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleFileSelection(index)}
                            disabled={item.status === 'success' || item.status === 'uploading' || upload.isUploading}
                          />
                          
                          <Box 
                            style={{ 
                              width: 40, 
                              height: 40, 
                              backgroundColor: `var(--${color}-3)`, 
                              borderRadius: 'var(--radius-3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              flexShrink: 0
                            }}
                          >
                            {ext === 'pdf' ? '📕' : '📄'}
                          </Box>
                          
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            {item.isEditing ? (
                              <Flex direction="column" gap="2">
                                <TextField.Root
                                  value={item.customName}
                                  onChange={(e) => handleNameChange(index, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, index)}
                                  disabled={upload.isUploading}
                                  autoFocus
                                  size="1"
                                  placeholder="Введите название"
                                />
                                <Flex gap="2">
                                  <Button 
                                    size="1" 
                                    variant="soft" 
                                    color="gray" 
                                    onClick={() => cancelEditing(index)}
                                    disabled={upload.isUploading}
                                  >
                                    Отмена
                                  </Button>
                                  <Button 
                                    size="1" 
                                    onClick={() => saveName(index, item.customName)}
                                    disabled={upload.isUploading || !item.customName.trim()}
                                  >
                                    <FiSave size={12} />
                                    Сохранить
                                  </Button>
                                </Flex>
                              </Flex>
                            ) : (
                              <Flex align="center" gap="2" wrap="wrap">
                                <Text size="2" weight="bold" style={{ 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap',
                                  maxWidth: '250px'
                                }}>
                                  {item.customName}
                                </Text>
                                {getStatusIcon(item.status)}
                                {item.status === 'pending' && (
                                  <Tooltip content="Редактировать название">
                                    <IconButton 
                                      size="1" 
                                      variant="ghost"
                                      onClick={() => startEditing(index)}
                                      disabled={upload.isUploading}
                                    >
                                      <FiEdit2 size={12} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Flex>
                            )}
                            
                            <Flex gap="2" mt="1" align="center" wrap="wrap">
                              <Badge size="1" variant="soft" color={color as any}>
                                .{ext}
                              </Badge>
                              <Badge size="1" variant="soft" color="gray">
                                {formatFileSize(item.file.size)}
                              </Badge>
                              
                              {item.status === 'uploading' && item.progress !== undefined && (
                                <Box style={{ width: 80 }}>
                                  <Progress value={item.progress} size="1" />
                                </Box>
                              )}
                              
                              {item.status === 'error' && item.error && (
                                <Tooltip content={item.error}>
                                  <Text size="1" color="red">Ошибка</Text>
                                </Tooltip>
                              )}
                            </Flex>
                          </Box>
                        </Flex>
                      </Card>
                    );
                  })}
                </Box>
              </ScrollArea>
            )}
          </>
        ) : (
          /* Details Tab */
          <Box p="4">
            <DataList.Root>
              <DataList.Item>
                <DataList.Label minWidth="100px">
                  <Flex align="center" gap="1">
                    <FiFileText size={14} />
                    <Text size="2">Всего файлов</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2">{totalFiles}</Text>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="100px">
                  <Flex align="center" gap="1">
                    <FiHardDrive size={14} />
                    <Text size="2">Общий размер</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2">{formatFileSize(totalSize)}</Text>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="100px">
                  <Flex align="center" gap="1">
                    <FiFolder size={14} />
                    <Text size="2">Папка</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  {/* <Badge size="1" variant="soft" color="blue">
                    {upload.filePreview?.folderName}
                  </Badge> */}
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="100px">
                  <Flex align="center" gap="1">
                    <FaRegBuilding size={14} />
                    <Text size="2">Центр</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Tooltip content={currentSite?.name || 'Не указан'}>
                    <Text size="2" style={{ maxWidth: 250 }} truncate>
                      {currentSite?.name || 'Не указан'}
                    </Text>
                  </Tooltip>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="100px">
                  <Flex align="center" gap="1">
                    <FaClinicMedical size={14} />
                    <Text size="2">Исследование</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Tooltip content={currentStudy?.protocol || currentStudy?.title || 'Не указано'}>
                    <Text size="2" style={{ maxWidth: 250 }} truncate>
                      {currentStudy?.protocol || currentStudy?.title || 'Не указано'}
                    </Text>
                  </Tooltip>
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>
          </Box>
        )}

        <Separator size="4" />

        {/* Footer */}
        <Flex justify="between" align="center" p="4">
          <Box>
            <Text size="2" color="gray">
              Всего: {formatFileSize(totalSize)} в {totalFiles} файлах
            </Text>
          </Box>
          
          <Flex gap="3">
            <Button 
              variant="soft" 
              color="gray" 
              onClick={handleCancel}
              disabled={upload.isUploading}
            >
              Отмена
            </Button>
            
            {selectedIndices.size > 0 && (
              <Button 
                color="blue" 
                onClick={handleUploadSelected}
                disabled={upload.isUploading || selectedIndices.size === 0}
                variant="soft"
              >
                {upload.isUploading ? (
                  <Flex align="center" gap="2">
                    <Spinner size="1" />
                    <Text>Загрузка...</Text>
                  </Flex>
                ) : (
                  <Flex align="center" gap="2">
                    <FiUpload size={16} />
                    <Text>Загрузить выбранные ({selectedIndices.size})</Text>
                  </Flex>
                )}
              </Button>
            )}
            
            <Button 
              color="green" 
              onClick={handleUploadAll}
              disabled={upload.isUploading || pendingCount === 0}
            >
              {upload.isUploading ? (
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text>Загрузка...</Text>
                </Flex>
              ) : (
                <Flex align="center" gap="2">
                  <FiUpload size={16} />
                  <Text>Загрузить все ({pendingCount})</Text>
                </Flex>
              )}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>

      {/* Loading Overlay */}
      {upload.isUploading && (
        <Box 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          <Card style={{ padding: 20 }}>
            <Flex direction="column" align="center" gap="3">
              <Spinner size="3" />
              <Text size="2">Загрузка файлов...</Text>
              <Text size="1" color="gray">
                Загружено {successCount} из {totalFiles}
              </Text>
            </Flex>
          </Card>
        </Box>
      )}
    </Dialog.Root>
  );
};

export default FilePreviewPanel;