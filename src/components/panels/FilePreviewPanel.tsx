// components/FilePreviewPanel.tsx
import React, { useContext, useState } from 'react';
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
  Avatar
} from '@radix-ui/themes';
import { 
  FiX, 
  FiUpload, 
  FiEdit2, 
  FiSave,
  FiFile,
  FiFileText,
  FiFolder,
  FiHardDrive
} from 'react-icons/fi';
import { MainContext } from '@/wrappers/MainContext';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { useNotification } from '@/wrappers/NotificationContext';
import { FaClinicMedical, FaRegBuilding } from 'react-icons/fa';
import { Document } from '@/types/document';
import { ViewLevel } from '@/types/types';


interface FilePreviewPanelProps {
  onUploadSuccess?: (updatedDoc: Document) => void;
  onUploadError?: (error: string) => void;
}

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({ 
  onUploadSuccess, 
  onUploadError 
}) => {
  const { addNotification } = useNotification();
  const { context, clearFilePreview, updateContext } = useContext(MainContext)!;
  const { currentStudy, currentSite, currentLevel } = context;

  const { uploadFile, isUploading } = useDocumentUpload();
  const [isEditing, setIsEditing] = useState(false);
  const [customName, setCustomName] = useState('');

  const preview = context.filePreview;
  const isOpen = context.isPreviewOpen;

  if (!isOpen || !preview) return null;

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
      case 'pdf':
        return 'red';
      case 'txt':
        return 'blue';
      case 'doc':
      case 'docx':
        return 'blue';
      case 'xls':
      case 'xlsx':
        return 'green';
      default:
        return 'gray';
    }
  };

  const handleUpload = async () => {
    try {
      if ( !currentStudy?.id ) {
        const errorMsg = 'Ошибка: не выбрано исследование';
        addNotification('error', errorMsg);
        onUploadError?.(errorMsg);
        return;
      }

      if ( currentLevel === ViewLevel.SITE && !currentSite?.id) {
        const errorMsg = 'Ошибка: не указаны исследование или центр';
        addNotification('error', errorMsg);
        onUploadError?.(errorMsg);
        return;
      }



      const result = await uploadFile(preview.file, {
        studyId: String(currentStudy?.id),
        siteId: String(currentSite?.id),
        folderId: preview.folderId,
        folderName: preview.folderName,
        createdBy: preview.createdBy,
        tmfZone: null,
        tmfArtifact: null,
        customFileName: preview.customName !== preview.file.name ? preview.customName : undefined
        
      });

      if (result.success && result.document) {
        clearFilePreview();
        updateContext({ selectedDocument: null });
        addNotification('success', 'Документ успешно загружен');
        console.log(result.document)
        onUploadSuccess?.(result.document);
      } else {
        const errorMsg = result.error || 'Неизвестная ошибка при загрузке';
        addNotification('error', `Ошибка при загрузке: ${errorMsg}`);
        onUploadError?.(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      addNotification('error', `Ошибка при загрузке: ${errorMsg}`);
      onUploadError?.(errorMsg);
    }
  };  

  const handleCancel = () => {
    clearFilePreview();
  };

  const startEditing = () => {
    setCustomName(preview.customName);
    setIsEditing(true);
  };

  const saveName = () => {
    if (customName.trim()) {
      preview.customName = customName.trim();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveName();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setCustomName(preview.customName);
    }
  };

  const fileExtension = getFileExtension(preview.file.name);
  const fileColor = getFileColor(fileExtension);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && !isUploading && handleCancel()}>
      <Dialog.Content style={{ maxWidth: 500, padding: 0 }}>
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
              Предпросмотр документа
            </Dialog.Title>
          </Flex>
          <Dialog.Close disabled={isUploading}>
            <IconButton variant="ghost" size="2" disabled={isUploading}>
              <FiX />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {/* File Icon and Basic Info */}
        <Box p="4">
          <Card size="1" variant="surface">
            <Flex gap="4" align="center">
              <Box 
                style={{ 
                  width: 64, 
                  height: 64, 
                  backgroundColor: `var(--${fileColor}-3)`, 
                  borderRadius: 'var(--radius-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px'
                }}
              >
                {fileExtension === 'pdf' ? '📕' : '📄'}
              </Box>
              <Box style={{ flex: 1 }}>
                <Text size="3" weight="bold">
                  {preview.file.name}
                </Text>
                <Flex gap="2" mt="2" wrap="wrap">
                  <Badge size="1" variant="soft" color={fileColor as any}>
                    .{fileExtension}
                  </Badge>
                  <Badge size="1" variant="soft" color="gray">
                    {formatFileSize(preview.size)}
                  </Badge>
                </Flex>
              </Box>
            </Flex>
          </Card>
        </Box>

        <Separator size="4" />

        {/* File Details */}
        <Box p="4">
          <Box mb="4">
          <Text size="2" weight="medium" mb="3">Информация о файле</Text>
          </Box>
          <DataList.Root>
            <DataList.Item>
              <DataList.Label minWidth="100px">
                <Flex align="center" gap="1">
                  <FiFileText size={14} />
                  <Text size="2">Тип</Text>
                </Flex>
              </DataList.Label>
              <DataList.Value>
                <Text size="2">{preview.file.type || 'Неизвестно'}</Text>
              </DataList.Value>
            </DataList.Item>

            <DataList.Item>
              <DataList.Label minWidth="100px">
                <Flex align="center" gap="1">
                  <FiHardDrive size={14} />
                  <Text size="2">Размер</Text>
                </Flex>
              </DataList.Label>
              <DataList.Value>
                <Text size="2">{formatFileSize(preview.size)}</Text>
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
                <Badge size="1" variant="soft" color="blue">
                  {preview.folderName}
                </Badge>
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

        <Separator size="4" />

        {/* Name Editing Section */}
<Box p="4">
  <Text size="2" weight="medium" mb="2">Название документа</Text>
  
  <Card size="1" variant="surface">
    <Box p="3">
      {isEditing ? (
        <Flex direction="column" gap="3">
          <TextField.Root
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Введите название документа"
            onKeyDown={handleKeyDown}
            disabled={isUploading}
            autoFocus
            size="2"
          />
          <Flex gap="2" justify="end">
            <Button 
              size="1" 
              variant="soft" 
              color="gray" 
              onClick={() => {
                setIsEditing(false);
                setCustomName(preview.customName);
              }}
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button 
              size="1" 
              onClick={saveName}
              disabled={isUploading || !customName.trim()}
            >
              <Flex align="center" gap="1">
                <FiSave size={14} />
                <Text>Сохранить</Text>
              </Flex>
            </Button>
          </Flex>
        </Flex>
      ) : (
        <Flex 
          justify="between" 
          align="center" 
          gap="2"
          style={{ minWidth: 0 }} // Важно для корректной работы flex
        >
          <Box style={{ 
            flex: 1,
            minWidth: 0, // Позволяет тексту сжиматься
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            <Tooltip content={preview.customName}>
              <Text size="2" weight="bold" style={{ 
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {preview.customName}
              </Text>
            </Tooltip>
          </Box>
          <Tooltip content="Изменить название">
            <Button 
              size="1" 
              variant="soft" 
              onClick={startEditing}
              disabled={isUploading}
              style={{ flexShrink: 0 }} // Кнопка не сжимается
            >
              <Flex align="center" gap="1">
                <FiEdit2 size={14} />
                <Text>Изменить</Text>
              </Flex>
            </Button>
          </Tooltip>
        </Flex>
      )}
    </Box>
  </Card>
</Box>

        <Separator size="4" />

        {/* Footer */}
        <Flex justify="end" gap="3" p="4">
          <Button 
            variant="soft" 
            color="gray" 
            onClick={handleCancel}
            disabled={isUploading}
          >
            Отмена
          </Button>
          <Button 
            color="green" 
            onClick={handleUpload}
            disabled={isUploading}
            size="2"
          >
            {isUploading ? (
              <Flex align="center" gap="2">
                <Spinner size="1" />
                <Text>Загрузка...</Text>
              </Flex>
            ) : (
              <Flex align="center" gap="2">
                <FiUpload size={16} />
                <Text>Загрузить документ</Text>
              </Flex>
            )}
          </Button>
        </Flex>
      </Dialog.Content>

      {/* Loading Overlay */}
      {isUploading && (
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
              <Text size="2">Загрузка документа...</Text>
            </Flex>
          </Card>
        </Box>
      )}
    </Dialog.Root>
  );
};

export default FilePreviewPanel;