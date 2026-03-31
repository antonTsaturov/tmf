// components/RestoreDocumentPanel.tsx
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
  Tooltip,
  DataList
} from '@radix-ui/themes';
import {
  FiX,
  FiRotateCcw,
  FiInfo,
  FiCheckCircle
} from 'react-icons/fi';
import { MainContext } from "@/wrappers/MainContext";
import { useNotification } from '@/wrappers/NotificationContext';
import { Document } from '@/types/document';
import { useDocumentRestore } from '@/hooks/useDocumentRestore';
import { logger } from '@/lib/logger';

interface RestoreDocumentPanelProps {
  onDocumentRestored?: (updatedDoc: Document) => void;
}

const RestoreDocumentPanel: React.FC<RestoreDocumentPanelProps> = ({
  onDocumentRestored,
}) => {
  const requireReason = true;
  const maxReasonLength = 200;
  const mainContext = useContext(MainContext);
  if (!mainContext) throw new Error('RestoreDocumentPanel must be used within MainContext Provider');

  const { context, updateContext } = mainContext;
  const { isRestorePanelOpen, selectedDocument, currentStudy, currentSite, currentLevel } = context;
  const { addNotification } = useNotification();

  const { restoreDocument, isRestoring, error: hookError } = useDocumentRestore();

  const [restorationReason, setRestorationReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [isReasonTouched, setIsReasonTouched] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Reset state when panel opens
  useEffect(() => {
    if (isRestorePanelOpen && selectedDocument?.is_deleted) {
      setRestorationReason("");
      setReasonError("");
      setIsReasonTouched(false);
      setShowConfirmDialog(false);
    }
  }, [isRestorePanelOpen, selectedDocument]);

  // Show error from hook via notification
  useEffect(() => {
    if (hookError) {
      addNotification('error', hookError);
    }
  }, [hookError, addNotification]);

  // Validate restoration reason
  const validateReason = (reason: string): boolean => {
    if (!requireReason) return true;

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setReasonError("Restoration reason is required");
      return false;
    }

    if (trimmedReason.length > maxReasonLength) {
      setReasonError(`Reason cannot exceed ${maxReasonLength} characters`);
      return false;
    }

    setReasonError("");
    return true;
  };

  // Handle reason change
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newReason = e.target.value;
    setRestorationReason(newReason);

    if (isReasonTouched) {
      validateReason(newReason);
    }
  };

  // Handle reason blur
  const handleReasonBlur = () => {
    setIsReasonTouched(true);
    validateReason(restorationReason);
  };

  // Handle restore action
  const handleRestore = async () => {
    if (!selectedDocument) return;

    // Validate before submission
    setIsReasonTouched(true);
    if (!validateReason(restorationReason)) {
      return;
    }

    try {
      const result = await restoreDocument(
        selectedDocument.id,
        restorationReason.trim() || undefined
      );

      if (result.success && result.document) {
        addNotification('success', 'Document successfully restored');
        updateContext({ isRestorePanelOpen: false });
        updateContext({ selectedDocument: null });
        onDocumentRestored?.(result.document);
        setRestorationReason("");
      } else if (result.error) {
        addNotification('error', result.error);
      }
    } catch (error) {
      logger.error('Error restoring document', error);
      addNotification('error', 'Error restoring document');
    }
  };

  const handleRestoreClick = () => {
    if (requireReason && !validateReason(restorationReason)) {
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleCancel = () => {
    setRestorationReason("");
    setReasonError("");
    setIsReasonTouched(false);
    updateContext({ isRestorePanelOpen: false, selectedDocument: null });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Only show if panel is open and document is deleted
  if (!isRestorePanelOpen || !selectedDocument || !selectedDocument.is_deleted) return null;

  return (
    <>
      <Dialog.Root open={isRestorePanelOpen} onOpenChange={(open) => !open && !isRestoring && handleCancel()}>
        <Dialog.Content style={{ maxWidth: 550, padding: 0 }}>
          {/* Header */}
          <Flex
            justify="between"
            align="center"
            p="4"
            style={{ borderBottom: '1px solid var(--gray-5)' }}
          >
            <Flex align="center" gap="2">
              <Box className="rt-AvatarRoot" style={{ width: 32, height: 32 }}>
                <FiRotateCcw size={20} color="var(--green-9)" />
              </Box>
              <Dialog.Title size="4" style={{ margin: 0 }}>
                Restore Document
              </Dialog.Title>
            </Flex>
            <Dialog.Close disabled={isRestoring}>
              <IconButton variant="ghost" size="2" disabled={isRestoring}>
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
                    justifyContent: 'center',
                    backgroundColor: 'var(--green-3)'
                  }}
                >
                  <FiCheckCircle size={24} color="var(--green-9)" />
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="3" weight="bold">
                    {selectedDocument.current_version.document_name || selectedDocument.current_version.file_name}
                  </Text>
                  <Flex gap="2" mt="2" wrap="wrap">
                    <Tooltip content={selectedDocument.id}>
                      <Badge size="1" variant="soft" color="gray">
                        ID: {selectedDocument.id.substring(0, 8)}...
                      </Badge>
                    </Tooltip>
                    {selectedDocument.document_number && (
                      <Badge size="1" variant="soft" color="blue">
                        Version: {selectedDocument.document_number}
                      </Badge>
                    )}
                    <Badge size="1" variant="solid" color="red">
                      Deleted
                    </Badge>
                  </Flex>
                </Box>
              </Flex>
            </Card>
          </Box>

          <Separator size="4" />

          {/* Context Information */}
          <Box p="4">
            <Box mb="3">
              <Text size="2" weight="medium">Document Information</Text>
            </Box>
            <DataList.Root>
              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Study</Text>
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
                    <Text size="2">Protocol</Text>
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
                      <Text size="2">Site</Text>
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
                    <Text size="2">Level</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2">{`${currentLevel === 'site' ? 'Site level' : 'General'}`}</Text>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Folder</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2">{selectedDocument.folder_name || '—'}</Text>
                </DataList.Value>
              </DataList.Item>

              <DataList.Item>
                <DataList.Label minWidth="80px">
                  <Flex align="center" gap="1">
                    <Text size="2">Deleted At</Text>
                  </Flex>
                </DataList.Label>
                <DataList.Value>
                  <Text size="2" color="red">{formatDate(selectedDocument.deleted_at)}</Text>
                </DataList.Value>
              </DataList.Item>

              {selectedDocument.deletion_reason && (
                <DataList.Item>
                  <DataList.Label minWidth="80px">
                    <Flex align="center" gap="1">
                      <Text size="2">Deletion Reason</Text>
                    </Flex>
                  </DataList.Label>
                  <DataList.Value>
                    <Text size="2" color="gray" style={{ fontStyle: 'italic' }}>
                      {selectedDocument.deletion_reason}
                    </Text>
                  </DataList.Value>
                </DataList.Item>
              )}
            </DataList.Root>
          </Box>

          <Separator size="4" />

          {/* Success Message */}
          <Box px="4" pb="2" mt="2">
            <Flex
              gap="2"
              p="3"
              style={{
                backgroundColor: 'var(--green-3)',
                borderRadius: 'var(--radius-2)',
                border: '1px solid var(--green-6)'
              }}
            >
              <FiCheckCircle size={18} color="var(--green-10)" style={{ marginTop: 3 }} />
              <Box>
                <Text size="2" style={{ color: 'var(--green-12)' }} mt="2">
                  The document will be restored to its original location with all versions intact.
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* Reason Field */}
          <Box p="4">
            <Flex direction="column" gap="3">
              <Box>
                <Flex align="center" gap="2" mb="1">
                  <Text as="label" size="2" weight="medium" htmlFor="restorationReason">
                    Reason for restoration
                  </Text>
                  {requireReason && (
                    <Badge size="1" variant="solid" color="blue">Optional</Badge>
                  )}
                  <Tooltip content="Provide a reason for restoring this document (optional but recommended for audit trail)">
                    <FiInfo size={14} color="var(--gray-9)" />
                  </Tooltip>
                </Flex>

                <TextArea
                  id="restorationReason"
                  value={restorationReason}
                  onChange={handleReasonChange}
                  onBlur={handleReasonBlur}
                  placeholder="Enter restoration reason (optional)..."
                  disabled={isRestoring}
                  rows={3}
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
                    color={restorationReason.length > maxReasonLength ? 'red' : 'gray'}
                  >
                    {restorationReason.length}/{maxReasonLength}
                  </Text>
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
              disabled={isRestoring}
            >
              Cancel
            </Button>
            <Button
              color="green"
              onClick={handleRestoreClick}
              //disabled={isSubmitDisabled}
            >
              {isRestoring ? (
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text>Restoring...</Text>
                </Flex>
              ) : (
                <Flex align="center" gap="2">
                  <FiRotateCcw size={16} />
                  <Text>Restore</Text>
                </Flex>
              )}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Confirmation Dialog */}
      <AlertDialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog} >
        <AlertDialog.Content style={{ maxWidth: 400 }} onClick={(e)=>e.preventDefault()}>
          <AlertDialog.Title>Confirm Restoration</AlertDialog.Title>

          <AlertDialog.Description>
              <Text size="2">
                Are you sure you want to restore "{selectedDocument?.document_name || selectedDocument?.file_name}"?
              </Text>

              {restorationReason && (
                <Box mt="3" p="2" style={{ backgroundColor: 'var(--green-3)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="1" weight="bold" color="green">Reason: </Text>
                  <Text size="1" color="green">{restorationReason}</Text>
                </Box>
              )}

              <Box mt="3" p="2" style={{ backgroundColor: 'var(--blue-3)', borderRadius: 'var(--radius-2)' }}>
                <Flex align="center" gap="2">
                  <FiInfo size={16} color="var(--blue-9)" />
                  <Text size="1" style={{ color: 'var(--blue-11)' }}>
                    The document will be restored to its original folder with all metadata preserved.
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
                color="green"
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleRestore();
                }}
              >
                Confirm Restore
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* Loading Overlay */}
      {isRestoring && (
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
              <Text size="2">Restoring document...</Text>
            </Flex>
          </Card>
        </Box>
      )}
    </>
  );
};

export default RestoreDocumentPanel;
