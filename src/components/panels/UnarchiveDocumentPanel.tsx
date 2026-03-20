// components/UnarchiveDocumentPanel.tsx
import React, { useContext, useState } from "react";
import {
  Flex,
  Text,
  Button,
  Box,
  AlertDialog,
  TextArea
} from '@radix-ui/themes';
import { MainContext } from "@/wrappers/MainContext";
import { useDocumentUnarchive } from "@/hooks/useDocumentUnarchive";
import { useNotification } from '@/wrappers/NotificationContext';
import { Document } from '@/types/document';

interface UnarchiveDocumentPanelProps {
  onDocumentUnarchived?: (updatedDoc: Document) => void;
}

const UnarchiveDocumentPanel: React.FC<UnarchiveDocumentPanelProps> = ({ onDocumentUnarchived }) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('UnarchiveDocumentPanel must be used within MainContext Provider');

  const { context, updateContext } = mainContext;
  const { isUnarchivePanelOpen, selectedDocument } = context;
  const { addNotification } = useNotification();

  const { unarchiveDocument, isUnarchiving, error } = useDocumentUnarchive();
  const [unarchiveReason, setUnarchiveReason] = useState('');

  // Показываем ошибку через уведомление
  if (error) {
    addNotification('error', error);
  }

  const handleUnarchive = async () => {
    if (!selectedDocument) return;
    if (!unarchiveReason.trim()) {
      addNotification('error', 'Укажите причину разархивации');
      return;
    }

    try {
      const result = await unarchiveDocument(selectedDocument.id, unarchiveReason);

      if (result.success && onDocumentUnarchived) {
        addNotification('success', 'Документ успешно разархивирован');
        updateContext({ isUnarchivePanelOpen: false });
        updateContext({ selectedDocument: null });
        setUnarchiveReason('');
        onDocumentUnarchived(result.data.document);
      }
    } catch (error) {
      console.error('Error unarchiving document:', error);
      addNotification('error', 'Ошибка при разархивации документа');
    }
  };

  const handleCancel = () => {
    updateContext({ isUnarchivePanelOpen: false });
    setUnarchiveReason('');
  };

  if (!selectedDocument) return null;

  return (
    <AlertDialog.Root open={isUnarchivePanelOpen} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <AlertDialog.Content style={{ maxWidth: 450 }}>
        <AlertDialog.Title>Подтверждение разархивации</AlertDialog.Title>

        <AlertDialog.Description size="2">
          <div>
            Вы точно хотите разархивировать документ "{selectedDocument?.document_name || selectedDocument?.file_name}"?
            <Box mt="3" p="2" style={{ backgroundColor: 'var(--amber-3)', borderRadius: 'var(--radius-2)' }}>
              <Text size="1" style={{ color: 'var(--amber-12)' }}>
                Документ будет разархивирован в статусе draft
              </Text>
            </Box>
          </div>
        </AlertDialog.Description>

        <Box mt="4">
          <Text size="2" weight="medium" mb="2">
            Причина разархивации <Text color="red">*</Text>
          </Text>
          <TextArea
            placeholder="Укажите причину разархивации документа..."
            value={unarchiveReason}
            onChange={(e) => setUnarchiveReason(e.target.value)}
            rows={3}
            autoFocus
          />
        </Box>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" disabled={isUnarchiving}>
              Отмена
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button
              variant="solid"
              color="amber"
              onClick={handleUnarchive}
              disabled={isUnarchiving || !unarchiveReason.trim()}
            >
              {isUnarchiving ? 'Разархивация...' : 'Разархивировать'}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};

export default UnarchiveDocumentPanel;
