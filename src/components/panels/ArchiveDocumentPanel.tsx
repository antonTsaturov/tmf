// components/ArchiveDocumentPanel.tsx
import React, { useContext, useState, useEffect } from "react";
import { 
  Dialog, 
  Flex, 
  Text, 
  Button, 
  Box, 
  Card,
  Badge,
  Spinner,
  IconButton,
  Separator,
  AlertDialog,
  Tooltip,
  DataList
} from '@radix-ui/themes';
import { 
  FiX, 
  FiArchive, 
  FiFolder, 
  FiCalendar,
  FiHash,
  FiInfo,
  FiAlertTriangle,
  FiFileText
} from 'react-icons/fi';
import { MainContext } from "@/wrappers/MainContext";
import { useDocumentArchive } from "@/hooks/useDocumentArchive";
import { useNotification } from '@/wrappers/NotificationContext';

interface ArchiveDocumentPanelProps {
  onDocumentArchived?: () => void;
}

const ArchiveDocumentPanel: React.FC<ArchiveDocumentPanelProps> = ({ 
  onDocumentArchived 
}) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('ArchiveDocumentPanel must be used within MainContext Provider');

  const { context, updateContext } = mainContext;
  const { isArchivePanelOpen, selectedDocument, currentStudy, currentSite, currentLevel } = context;
  const { addNotification } = useNotification();

  const { archiveDocument, isArchiving, error } = useDocumentArchive();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!isArchivePanelOpen) {
      setShowConfirmDialog(false);
    }
  }, [isArchivePanelOpen]);

  // Показываем ошибку через уведомление
  useEffect(() => {
    if (error) {
      addNotification('error', error);
    }
  }, [error, addNotification]);

  const handleArchive = async () => {
    if (!selectedDocument) return;
    
    try {
      const result = await archiveDocument(selectedDocument.id);
      
      if (result.success) {
        addNotification('success', 'Документ успешно архивирован');
        updateContext({ isArchivePanelOpen: false });
        updateContext({ selectedDocument: null });
        onDocumentArchived?.();
      }
    } catch (error) {
      console.error('Error archiving document:', error);
      addNotification('error', 'Ошибка при архивации документа');
    }
  };

  const handleArchiveClick = () => {
    setShowConfirmDialog(true);
  };

  const handleCancel = () => {
    updateContext({ isArchivePanelOpen: false });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isArchivePanelOpen || !selectedDocument) return null;

  return (
    <>
      <Dialog.Root open={isArchivePanelOpen} onOpenChange={(open) => !open && !isArchiving && handleCancel()}>
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
                <FiArchive size={20} color="var(--amber-9)" />
              </Box>
              <Dialog.Title size="4" style={{ margin: 0 }}>
                Архивация документа
              </Dialog.Title>
            </Flex>
            <Dialog.Close disabled={isArchiving}>
              <IconButton variant="ghost" size="2" disabled={isArchiving}>
                <FiX />
              </IconButton>
            </Dialog.Close>
          </Flex>

          {/* Document Info Card */}
          <Box p="4">
            <Card size="1" variant="surface">
              <Flex gap="3" align="start">
                <Box 
                  className="rt-AvatarRoot" 
                  style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 'var(--radius-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FiFileText size={24} />
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="3" weight="bold">
                    {selectedDocument.document_name || selectedDocument.file_name}
                  </Text>
                  <Flex gap="2" mt="2" wrap="wrap">
                    <Tooltip content={selectedDocument.id}>
                      <Badge size="1" variant="soft" color="gray">
                        ID: {selectedDocument.id.substring(0, 8)}...
                      </Badge>
                    </Tooltip>
                    {selectedDocument.document_number && (
                      <Badge size="1" variant="soft" color="blue">
                        Версия: {selectedDocument.document_number}
                      </Badge>
                    )}
                  </Flex>
                </Box>
              </Flex>
            </Card>
          </Box>

          <Separator size="4" />

          {/* Context Information */}
          <Box p="4">
            <Box mb="3">
              <Text size="2" weight="medium">Информация о документе</Text>
            </Box>
            <DataList.Root>
              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Исследование</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Tooltip content={currentStudy?.title || `ID: ${selectedDocument.study_id}`}>
                    <Text size="2" style={{ maxWidth: 250 }} truncate>
                      {currentStudy?.title || `ID: ${selectedDocument.study_id}`}
                    </Text>
                  </Tooltip>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Протокол</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Tooltip content={currentStudy?.protocol || `ID: ${selectedDocument.study_id}`}>
                    <Text size="2" style={{ maxWidth: 250 }} truncate>
                      {currentStudy?.protocol}
                    </Text>
                  </Tooltip>
                </DataList.Value>
              </DataList.Item>

              {currentSite && (
                <DataList.Item>
                  <DataList.Label minWidth="80px">
                    <Flex align="center" gap="1">
                      <Text size="2">Центр</Text>
                    </Flex>
                  </DataList.Label>
                  <DataList.Value>
                    <Tooltip content={currentSite.name || `ID: ${selectedDocument.site_id}`}>
                      <Text size="2" style={{ maxWidth: 250 }} truncate>
                        {currentSite.name || `ID: ${selectedDocument.site_id}`}
                      </Text>
                    </Tooltip>
                  </DataList.Value>
                </DataList.Item>
              )}

              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Раздел</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2">{`${currentLevel === 'site' ? 'Site level' : 'General'}`}</Text>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Папка</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2">{selectedDocument.folder_name || '—'}</Text>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Создан</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2">{formatDate(selectedDocument.created_at)}</Text>
                </DataList.Value>
              </DataList.Item>
            </DataList.Root>
          </Box>

          <Separator size="4" />

          {/* Warning Message */}
          <Box px="4" pb="2" mt="2">
            <Flex 
              gap="2" 
              p="3" 
              style={{ 
                backgroundColor: 'var(--amber-1)', 
                borderRadius: 'var(--radius-2)',
                border: '1px solid var(--amber-6)'
              }}
            >
              <FiAlertTriangle size={18} color="var(--amber-10)" style={{ marginTop: 3 }} />
              <Box>
                <Text size="2" style={{ color: 'var(--amber-12)' }} mt="2">
                  Документ будет помечен как архивный.
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
              disabled={isArchiving}
            >
              Отмена
            </Button>
            <Button 
              color="amber" 
              onClick={handleArchiveClick}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text>Архивация...</Text>
                </Flex>
              ) : (
                <Flex align="center" gap="2">
                  <FiArchive size={16} />
                  <Text>Архивировать</Text>
                </Flex>
              )}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Confirmation Dialog */}
      <AlertDialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialog.Content style={{ maxWidth: 400 }}>
          <AlertDialog.Title>Подтверждение архивации</AlertDialog.Title>

          <AlertDialog.Description size="2" >
            <div>
              Вы уверены, что хотите архивировать документ "{selectedDocument?.document_name || selectedDocument?.file_name}"?
              <Box mt="3" p="2" style={{ backgroundColor: 'var(--amber-3)', borderRadius: 'var(--radius-2)' }}>
                <Flex align="center" gap="2">
                  <FiInfo size={16} color="var(--amber-9)" />
                  <Text size="1" style={{ color: 'var(--amber-12)' }}>
                    После подтверждения отменить это действие будет невозможно.
                  </Text>
                </Flex>
              </Box>
            </div>
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Отмена
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button 
                variant="solid" 
                color="amber" 
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleArchive();
                }}
              >
                Архивировать
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Loading Overlay (optional) */}
      {isArchiving && (
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
              <Text size="2">Архивация документа...</Text>
            </Flex>
          </Card>
        </Box>
      )}
    </>
  );
};

export default ArchiveDocumentPanel;