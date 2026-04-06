// components/DeleteDocumentPanel.tsx
import React, { useContext, useState, useEffect } from "react";
import { 
  Dialog, 
  Flex, 
  Text, 
  Button, 
  Box, 
  Card,
  Badge,
  TextArea,
  Spinner,
  IconButton,
  Separator,
  AlertDialog,
  Tooltip
} from '@radix-ui/themes';
import { 
  FiX, 
  FiTrash2, 
  FiAlertTriangle,
  FiInfo,
  FiFileText
} from 'react-icons/fi';
import { useDocumentDelete } from "@/hooks/useDocumentDelete";
import { MainContext } from "@/wrappers/MainContext";
import { useNotification } from '@/wrappers/NotificationContext';
import { logger } from '@/lib/utils/logger';

interface DeleteDocumentPanelProps {
  onDocumentDeleted?: () => void;
  onDocumentRestored?: () => void;
  requireReason?: boolean;
  maxReasonLength?: number;
  reasonPlaceholder?: string;
}

const DeleteDocumentPanel: React.FC<DeleteDocumentPanelProps> = ({ 
  onDocumentDeleted, 
  onDocumentRestored,
  requireReason = true,
  maxReasonLength = 500,
  reasonPlaceholder = "Enter reason for deletion..."
}) => {
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('DeleteDocumentPanel must be used within MainContext Provider');

  const { context, updateContext } = mainContext;
  const { isDeletePanelOpen, selectedDocument } = context;
  const { addNotification } = useNotification();

  const [deletionReason, setDeletionReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [isReasonTouched, setIsReasonTouched] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { deleteDocument, isDeleting, isRestoring, error } = useDocumentDelete();

  // Сброс состояния при открытии панели
  useEffect(() => {
    if (isDeletePanelOpen) {
      setDeletionReason("");
      setReasonError("");
      setIsReasonTouched(false);
      setShowConfirmDialog(false);
    }
  }, [isDeletePanelOpen]);

  // Показываем ошибку через уведомление
  useEffect(() => {
    if (error) {
      addNotification('error', error);
    }
  }, [error, addNotification]);

  // Валидация причины удаления
  const validateReason = (reason: string): boolean => {
    if (!requireReason) return true;
    
    const trimmedReason = reason.trim();
    
    if (!trimmedReason) {
      setReasonError("Deletion reason is required");
      return false;
    }
    
    if (trimmedReason.length < 10) {
      setReasonError("Reason must be at least 10 characters long");
      return false;
    }
    
    if (trimmedReason.length > maxReasonLength) {
      setReasonError(`Reason cannot exceed ${maxReasonLength} characters`);
      return false;
    }
    
    setReasonError("");
    return true;
  };

  // Обработчик изменения причины
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newReason = e.target.value;
    setDeletionReason(newReason);
    
    if (isReasonTouched) {
      validateReason(newReason);
    }
  };

  // Обработчик потери фокуса
  const handleReasonBlur = () => {
    setIsReasonTouched(true);
    validateReason(deletionReason);
  };

  // Обработчик мягкого удаления
  const handleSoftDelete = async () => {
    if (!selectedDocument) return;
    
    // Валидация перед отправкой
    setIsReasonTouched(true);
    if (!validateReason(deletionReason)) {
      return;
    }
    
    try {
      const result = await deleteDocument(
        selectedDocument.id,
        deletionReason.trim()
      );
      
      if (result.success) {
        addNotification('success', 'Документ успешно удален');
        updateContext({ isDeletePanelOpen: false });
        updateContext({ selectedDocument: null });
        onDocumentDeleted?.();
        setDeletionReason("");
      }
    } catch (error) {
      logger.error('Error deleting document', error);
      addNotification('error', 'Error deleting document');
    }
  };

  const handleDeleteClick = () => {
    if (requireReason && !validateReason(deletionReason)) {
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleCancel = () => {
    setDeletionReason("");
    setReasonError("");
    setIsReasonTouched(false);
    updateContext({ isDeletePanelOpen: false });
  };

  if (!isDeletePanelOpen || !selectedDocument) return null;

  const isReasonValid = !requireReason || (deletionReason.trim().length >= 10 && deletionReason.trim().length <= maxReasonLength);
  const isSubmitDisabled = isDeleting || (requireReason && !isReasonValid);

  return (
    <>
      <Dialog.Root open={isDeletePanelOpen} onOpenChange={(open) => !open && !isDeleting && handleCancel()}>
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
                <FiTrash2 size={20} color="var(--red-9)" />
              </Box>
              <Dialog.Title size="4" style={{ margin: 0 }}>
                Delete Confirmation
              </Dialog.Title>
            </Flex>
            <Dialog.Close disabled={isDeleting}>
              <IconButton variant="ghost" size="2" disabled={isDeleting}>
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
              {/* Warning Message */}
              <Box style={{ 
                backgroundColor: 'var(--red-2)', 
                padding: '12px', 
                borderRadius: 'var(--radius-2)',
                border: '1px solid var(--red-6)'
              }}>
                <Flex gap="2" align="center">
                  <FiAlertTriangle size={18} color="var(--red-9)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <Box>
                    <Text size="1" style={{ color: 'var(--red-11)' }} mt="1">
                      The document and its versions will no longer be visible in active folders.
                      But the record will be retained in the system and can be restored/viewed by an authorized user.
                    </Text>
                  </Box>
                </Flex>
              </Box>

              {/* Reason Field */}
              <Box>
                <Flex align="center" gap="2" mb="1">
                  <Text as="label" size="2" weight="medium" htmlFor="deletionReason">
                    Reason for deletion
                  </Text>
                  {requireReason && (
                    <Badge size="1" variant="solid" color="red">Required</Badge>
                  )}
                  <Tooltip content="Please provide a detailed reason for deleting this document">
                    <FiInfo size={14} color="var(--gray-9)" />
                  </Tooltip>
                </Flex>
                
                <TextArea
                  id="deletionReason"
                  value={deletionReason}
                  onChange={handleReasonChange}
                  onBlur={handleReasonBlur}
                  placeholder={reasonPlaceholder}
                  disabled={isDeleting}
                  rows={4}
                  maxLength={maxReasonLength}
                  autoFocus
                  variant={reasonError ? 'soft' : 'surface'}
                />
                
                <Flex justify="between" align="center" mt="1">
                  <Box>
                    {reasonError && (
                      <Text size="1" color="red">
                        {reasonError}
                      </Text>
                    )}
                  </Box>
                  <Text 
                    size="1" 
                    color={deletionReason.length > maxReasonLength ? 'red' : 'gray'}
                  >
                    {deletionReason.length}/{maxReasonLength}
                  </Text>
                </Flex>
              </Box>

              {/* Server Error */}
              {error && (
                <Box style={{ 
                  backgroundColor: 'var(--red-3)', 
                  padding: '8px 12px', 
                  borderRadius: 'var(--radius-2)',
                  border: '1px solid var(--red-6)'
                }}>
                  <Text size="2" color="red">
                    Error: {error}
                  </Text>
                </Box>
              )}
            </Flex>
          </Box>

          <Separator size="4" />

          {/* Footer */}
          <Flex justify="end" gap="3" p="4">
            <Button 
              variant="soft" 
              color="gray" 
              onClick={handleCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              color="red" 
              onClick={handleDeleteClick}
              disabled={isSubmitDisabled}
            >
              {isDeleting ? (
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text>Deleting...</Text>
                </Flex>
              ) : (
                <Flex align="center" gap="2">
                  <FiTrash2 size={16} />
                  <Text>Delete</Text>
                </Flex>
              )}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Confirmation Dialog */}
      <AlertDialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialog.Content style={{ maxWidth: 400 }}>
          <AlertDialog.Title>Confirm Deletion</AlertDialog.Title>
          <AlertDialog.Description>
              <Text as="div" size="2">
                Are you sure you want to delete "{selectedDocument?.document_name}"?
              </Text>
              
              {deletionReason && (
                <Box mt="3" p="2" style={{ backgroundColor: 'var(--red-3)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="1" weight="bold" color="red">Reason: </Text>
                  <Text size="1" color="red">{deletionReason}</Text>
                </Box>
              )}

              <Box mt="3" p="2" style={{ backgroundColor: 'var(--amber-3)', borderRadius: 'var(--radius-2)' }}>
                <Flex align="center" gap="2">
                  <FiInfo size={16} color="var(--amber-9)" />
                  <Text size="1" style={{ color: 'var(--amber-11)' }}>
                    This action can be undone by the eTMF system administraor only.
                  </Text>
                </Flex>
              </Box>
          </AlertDialog.Description>

          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button 
                variant="solid" 
                color="red" 
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleSoftDelete();
                }}
              >
                Confirm Delete
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Loading Overlay */}
      {isDeleting && (
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
              <Text size="2">Deleting document...</Text>
            </Flex>
          </Card>
        </Box>
      )}
    </>
  );
};

export default DeleteDocumentPanel;