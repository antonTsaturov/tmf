// components/EditDocumentTitlePanel.tsx
import React, { useContext, useState, useEffect } from "react";
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
  Tooltip
} from '@radix-ui/themes';
import {
  FiX,
  FiEdit2,
  FiFileText,
  FiInfo,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import { MainContext } from "@/wrappers/MainContext";
import { useNotification } from '@/wrappers/NotificationContext';
import { useRename } from '@/hooks/useRename';
import { Document } from "@/types/document";
import { logger } from '@/lib/utils/logger';

interface EditDocumentPanelProps {
  onTitleChange?: (newTitle: string) => void;
  maxTitleLength?: number;
  onRenameSuccess?: (updatedDoc: Document ) => void;
}

const EditDocumentPanel: React.FC<EditDocumentPanelProps> = ({
  onTitleChange,
  maxTitleLength = 200,
  onRenameSuccess
}) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('EditDocumentTitlePanel must be used within MainContext Provider');

  const { context, updateContext } = mainContext;
  const { isEditTitlePanelOpen, selectedDocument } = context;
  const { addNotification } = useNotification();
  const { renameDocument, isRenaming, error: renameError } = useRename();

  const [localTitle, setLocalTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [isTitleTouched, setIsTitleTouched] = useState(false);

  // Reset state when panel opens
  useEffect(() => {
    if (isEditTitlePanelOpen && selectedDocument) {
      setLocalTitle(selectedDocument.document_name || "");
      setTitleError("");
      setIsTitleTouched(false);
    }
  }, [isEditTitlePanelOpen, selectedDocument]);

  // Show rename error via notification
  useEffect(() => {
    if (renameError) {
      addNotification('error', renameError);
    }
  }, [renameError, addNotification]);

  // Validate title
  const validateTitle = (title: string): boolean => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setTitleError("Document title is required");
      return false;
    }

    if (trimmedTitle.length < 3) {
      setTitleError("Title must be at least 3 characters long");
      return false;
    }

    if (trimmedTitle.length > maxTitleLength) {
      setTitleError(`Title cannot exceed ${maxTitleLength} characters`);
      return false;
    }

    setTitleError("");
    return true;
  };

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);

    if (isTitleTouched) {
      validateTitle(newTitle);
    }
  };

  // Handle blur
  const handleTitleBlur = () => {
    setIsTitleTouched(true);
    validateTitle(localTitle);
  };

  // Handle save 
  const handleSave = async () => {
    setIsTitleTouched(true);

    if (!validateTitle(localTitle)) {
      return;
    }

    if (!selectedDocument) return;

    const trimmedTitle = localTitle.trim();
    const result = await renameDocument(selectedDocument.id, trimmedTitle);

    if (result.success) {
      const updatedDoc = result.document;
      addNotification('success', 'Document title updated');
      onTitleChange?.(trimmedTitle);
      if (updatedDoc) {
      onRenameSuccess?.(updatedDoc);
      updateContext({ isEditTitlePanelOpen: false });
      } else {
        logger.warn('Error updating document in folder');
      }
    }
  };

  const handleCancel = () => {
    setLocalTitle("");
    setTitleError("");
    setIsTitleTouched(false);
    updateContext({ isEditTitlePanelOpen: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isRenaming) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape' && !isRenaming) {
      handleCancel();
    }
  };

  if (!isEditTitlePanelOpen || !selectedDocument) return null;

  const isTitleValid = localTitle.trim().length >= 3 && localTitle.trim().length <= maxTitleLength;
  const isSubmitDisabled = isRenaming || !isTitleValid || titleError !== "";

  return (
    <Dialog.Root open={isEditTitlePanelOpen} onOpenChange={(open) => !open && !isRenaming && handleCancel()}>
      <Dialog.Content style={{ maxWidth: 500, padding: 0 }} aria-describedby={undefined}>
        {/* Header */}
        <Flex
          justify="between"
          align="center"
          p="4"
          style={{ borderBottom: '1px solid var(--gray-5)' }}
        >
          <Flex align="center" gap="2">
            <Box className="rt-AvatarRoot" style={{ width: 32, height: 32 }}>
              <FiEdit2 size={20} color="var(--blue-9)" />
            </Box>
            <Dialog.Title size="4" style={{ margin: 0 }}>
              Edit Document Title
            </Dialog.Title>
          </Flex>
          <Dialog.Close disabled={isRenaming}>
            <IconButton variant="ghost" size="2" disabled={isRenaming}>
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
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  size="3"
                  weight="bold"
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}
                  title={selectedDocument?.document_name}
                >
                  {selectedDocument?.document_name}
                </Text>
                <Flex gap="2" mt="2" wrap="wrap">
                  <Badge size="1" variant="soft" color="gray">
                    ID: {selectedDocument.id.substring(0, 8)}...
                  </Badge>
                  {selectedDocument.document_number && (
                    <Badge size="1" variant="soft" color="blue">
                      Version: {selectedDocument.document_number}
                    </Badge>
                  )}
                </Flex>
              </Box>
            </Flex>
          </Card>
        </Box>

        <Separator size="4" />

        {/* Content */}
        <Box p="4">
          <Flex direction="column" gap="4">
            {/* Title Field */}
            <Box>
              <Flex align="center" gap="2" mb="1">
                <Text as="label" size="2" weight="medium" htmlFor="documentTitle">
                  Document Title
                </Text>
                <Badge size="1" variant="solid" color="blue">Required</Badge>
                <Tooltip content="Enter a descriptive title for this document">
                  <FiInfo size={14} color="var(--gray-9)" />
                </Tooltip>
              </Flex>

              <TextField.Root
                id="documentTitle"
                value={localTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleKeyDown}
                disabled={isRenaming}
                placeholder="Enter document title..."
                variant={titleError ? 'soft' : 'surface'}
                autoFocus
                maxLength={maxTitleLength}
              />

              <Flex justify="between" align="center" mt="1">
                <Box>
                  {titleError && (
                    <Text size="1" color="red">
                      {titleError}
                    </Text>
                  )}
                </Box>
                <Text
                  size="1"
                  color={localTitle.length > maxTitleLength ? 'red' : 'gray'}
                >
                  {localTitle.length}/{maxTitleLength}
                </Text>
              </Flex>
            </Box>

            {/* Info Message */}
            <Box>
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
                  <Text size="1" style={{ color: 'var(--blue-11)' }}>
                    The document title will be updated in the database.
                  </Text>
                </Box>
              </Flex>
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
            disabled={isRenaming}
          >
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={handleSave}
            disabled={isSubmitDisabled}
          >
            {isRenaming ? (
              <Flex align="center" gap="2">
                <Spinner size="1" />
                <Text>Saving...</Text>
              </Flex>
            ) : (
              <Flex align="center" gap="2">
                <FiCheck size={16} />
                <Text>Save Changes</Text>
              </Flex>
            )}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default EditDocumentPanel;
