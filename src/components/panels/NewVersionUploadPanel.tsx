// components/NewVersionUploadPanel.tsx
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
  TextArea
} from '@radix-ui/themes';
import { 
  FiX, 
  FiUpload, 
  FiFileText, 
  FiInfo,
  FiAlertCircle,
  FiHash,
  FiHardDrive
} from 'react-icons/fi';
import { MainContext } from '@/wrappers/MainContext';
import { useAuth } from '@/wrappers/AuthProvider';
import { useDocumentNewVersion } from '@/hooks/useDocumentNewVersion';
import { useNotification } from '@/wrappers/NotificationContext';
import { Document } from '@/types/document';

interface NewVersionUploadPanelProps {
  //onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
  onSuccess?: (updatedDoc: Document) => void;
}

const NewVersionUploadPanel: React.FC<NewVersionUploadPanelProps> = ({onUploadError, onSuccess}) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) return null;
  const { context, clearNewVersionPreview, updateContext } = mainContext;
  const { addNotification } = useNotification();

  const clearPanel = () => {
    if (typeof clearNewVersionPreview === 'function') {
      clearNewVersionPreview();
    } else {
      updateContext({ newVersionPreview: null, isNewVersionPanelOpen: false });
    }
  };

  const { user } = useAuth();
  const { uploadNewVersion, isUploading } = useDocumentNewVersion();
  const [changeReason, setChangeReason] = useState('');

  const preview = context.newVersionPreview;
  const isOpen = context.isNewVersionPanelOpen;

  if (!isOpen || !preview || !user) return null;

  const { file, document } = preview;
  const createdBy = String(user.id);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async () => {
    if (!createdBy) {
      const err = 'Пользователь не авторизован';
      addNotification('error', err);
      onUploadError?.(err);
      return;
    }

    const result = await uploadNewVersion(document, file, {
      createdBy,
      changeReason: changeReason.trim() || undefined,
      resetStatusToDraft: true,
    });

    if (result.success && result.document) {
      clearPanel();
      updateContext({ selectedDocument: result.document });
      if (typeof result === 'object' && result !== null && onSuccess) {
        onSuccess(result.document); 
      }
      addNotification('success', 'Новая версия успешно загружена');
      //onUploadSuccess?.();
    } else {
      const err = result.error || 'Неизвестная ошибка';
      addNotification('error', `Ошибка: ${err}`);
      onUploadError?.(err);
    }
  };

  const handleCancel = () => {
    clearPanel();
    setChangeReason('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleUpload();
    }
  };

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
              <FiUpload size={20} color="var(--blue-9)" />
            </Box>
            <Dialog.Title size="4" style={{ margin: 0 }}>
              Новая версия документа
            </Dialog.Title>
          </Flex>
          <Dialog.Close disabled={isUploading}>
            <IconButton variant="ghost" size="2" disabled={isUploading}>
              <FiX />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {/* Document Info Card */}

        
        <Box p="4">
          <Text size="2" weight="medium" mb="3">Текущая версия докумена</Text>
          <Card size="1" variant="surface">
            <Flex gap="3" align="start">
              <Box 
                style={{ 
                  width: 48, 
                  height: 48, 
                  backgroundColor: 'var(--blue-3)', 
                  borderRadius: 'var(--radius-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiFileText size={24} color="var(--blue-9)" />
              </Box>
              <Box style={{ flex: 1 }}>
                <Text size="3" weight="bold">
                  {document.document_name || document.file_name}
                </Text>
                <Flex gap="2" mt="2" wrap="wrap">
                  <Badge size="1" variant="soft" color="blue">
                    <Flex align="center" gap="1">
                      <FiHash size={10} />
                      <Text>Версия: {document.document_number}</Text>
                    </Flex>
                  </Badge>
                </Flex>
              </Box>
            </Flex>
          </Card>
        </Box>

        <Separator size="4" />

        {/* File Information */}
        <Box p="4">
          <Text size="2" weight="medium" mb="3">Новая верси документа</Text>
          
          <Card size="1" variant="surface">
            <Box>
              <Flex gap="3" align="center">
                <Box 
                  style={{ 
                    width: 40, 
                    height: 40, 
                    backgroundColor: 'var(--green-3)', 
                    borderRadius: 'var(--radius-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  📄
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="2" weight="bold">
                    {file.name}
                  </Text>
                  <Flex align="center" gap="2" mt="1">
                    <Badge size="1" variant="soft" color="gray">
                      {file.type?.split('/')[1]?.toUpperCase() || 'Unknown'}
                    </Badge>
                    <Badge size="1" variant="soft" color="gray">
                      {formatFileSize(file.size)}
                    </Badge>
                  </Flex>
                </Box>
              </Flex>
            </Box>
          </Card>
        </Box>

        <Separator size="4" />

        {/* Change Reason */}
        <Box p="4">
          <Flex align="center" gap="2" mb="2">
            <Text size="2" weight="medium">Комментарий</Text>
            <Badge size="1" variant="soft" color="gray">Необязательно</Badge>
            <Tooltip content="Укажите причину создания новой версии (например: исправление ошибок, обновление данных)">
              <FiInfo size={14} color="var(--gray-9)" />
            </Tooltip>
          </Flex>
          
          <TextArea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Добавьте комментарий"
            disabled={isUploading}
            size="2"
            rows={3}
            maxLength={200}
          />
          
          <Flex justify="end" mt="1">
            <Text size="1" color="gray">
              {changeReason.length}/200
            </Text>
          </Flex>
        </Box>

        {/* Info Message */}
        <Box px="4" pb="2">
          <Flex 
            gap="2"
            align="center"
            p="3" 
            style={{ 
              backgroundColor: 'var(--blue-3)', 
              borderRadius: 'var(--radius-2)',
              border: '1px solid var(--blue-6)'
            }}
          >
            <FiAlertCircle size={18} color="var(--blue-9)" style={{ flexShrink: 0, marginTop: 2 }} />
            <Box>
              <Text size="1" style={{ color: 'var(--blue-10)' }} mt="1">
                Проверьте документ перед загрузкой.
                Предыдущая версия сохранится в истории документа.
              </Text>
            </Box>
          </Flex>
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
            color="blue" 
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
                <Text>Загрузить новую версию</Text>
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
              <Text size="2">Загрузка новой версии...</Text>
            </Flex>
          </Card>
        </Box>
      )}
    </Dialog.Root>
  );
};

export default NewVersionUploadPanel;