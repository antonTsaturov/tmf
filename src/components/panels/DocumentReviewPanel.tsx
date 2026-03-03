// components/DocumentReviewPanel.tsx
import React, { useContext, useState, useEffect } from 'react';
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
  Tooltip,
  Separator,
  AlertDialog
} from '@radix-ui/themes';
import { 
  FiX, 
  FiCheckCircle, 
  FiXCircle, 
  FiInfo,
  FiFileText,
  FiArrowLeft
} from 'react-icons/fi';
import { MainContext } from '@/wrappers/MainContext';
import { DocumentAction } from '@/types/document';
import { useAuth } from '@/wrappers/AuthProvider';
import { useNotification } from '@/wrappers/NotificationContext';

interface DocumentReviewPanelProps {
  onReviewComplete?: () => void;
}

const DocumentReviewPanel: React.FC<DocumentReviewPanelProps> = ({ onReviewComplete }) => {
  const { context, updateContext } = useContext(MainContext)!;
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const { selectedDocument, isAcceptedForReview } = context;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Сбрасываем состояние при закрытии
  useEffect(() => {
    if (!isAcceptedForReview) {
      setComment('');
      setRejectMode(false);
      setError(null);
    }
  }, [isAcceptedForReview]);

  const handleClose = () => {
    if (loading) return;
    updateContext({ isAcceptedForReview: false });
  };

  const handleApprove = async () => {
    if (!selectedDocument || !user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: DocumentAction.APPROVE,
          userId: user.id,
          userRole: user.role?.[0],
          comment: comment.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve document');
      }

      addNotification('success', 'Документ успешно утвержден');
      
      // Сбрасываем selectedDocument чтобы обновить кнопки
      updateContext({ selectedDocument: null });
      handleClose();
      onReviewComplete?.();
    } catch (err) {
      console.error('Error approving document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при утверждении документа');
      addNotification('error', 'Ошибка при утверждении документа');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDocument || !user) return;

    // Для reject комментарий обязателен
    if (!comment.trim()) {
      setError('Укажите причину отклонения');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: DocumentAction.REJECT,
          userId: user.id,
          userRole: user.role?.[0],
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject document');
      }

      addNotification('success', 'Документ отклонен');
      
      // Сбрасываем selectedDocument чтобы обновить кнопки
      updateContext({ selectedDocument: null });
      handleClose();
      onReviewComplete?.();
    } catch (err) {
      console.error('Error rejecting document:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при отклонении документа');
      addNotification('error', 'Ошибка при отклонении документа');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClick = () => {
    if (rejectMode) {
      // Если уже в режиме отклонения, показываем диалог подтверждения
      setShowConfirmDialog(true);
    } else {
      // Переключаемся в режим отклонения
      setRejectMode(true);
      setError(null);
    }
  };

  const handleBackToApprove = () => {
    setRejectMode(false);
    setComment('');
    setError(null);
  };

  const formatFileSize = (bytes?: number | string) => {
    if (!bytes) return '—';
    const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(n) || n === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAcceptedForReview || !selectedDocument) return null;

  return (
    <>
      <Dialog.Root open={isAcceptedForReview} onOpenChange={(open) => !open && !loading && handleClose()}>
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
                <FiCheckCircle size={20} color="var(--blue-9)" />
              </Box>
              <Dialog.Title size="4" style={{ margin: 0 }}>
                {rejectMode ? 'Отклонение документа' : 'Рассмотрение документа'}
              </Dialog.Title>
            </Flex>
            <Dialog.Close disabled={loading}>
              <IconButton variant="ghost" size="2" disabled={loading}>
                <FiX />
              </IconButton>
            </Dialog.Close>
          </Flex>

          {/* Document Info Card */}
          <Box p="4">
            <Card size="1" variant="surface">
              <Flex gap="3" align="start">
                <Box className="rt-AvatarRoot" style={{ width: 40, height: 40 }}>
                  <FiFileText size={24} />
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="3" weight="bold">
                    {selectedDocument.document_name}
                  </Text>
                  <Flex gap="2" mt="2" wrap="wrap">
                    <Badge size="1" variant="soft" color="gray">
                      Версия: {selectedDocument.document_number || '1'}
                    </Badge>
                    <Badge size="1" variant="soft" color="blue">
                      Размер: {formatFileSize(selectedDocument.file_size)}
                    </Badge>
                    {selectedDocument.tmf_artifact && (
                      <Badge size="1" variant="soft" color="purple">
                        {selectedDocument.tmf_artifact}
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
              {/* Reviewer Info */}
              <Box style={{ 
                backgroundColor: rejectMode ? 'var(--orange-3)' : 'var(--blue-3)', 
                padding: '12px', 
                borderRadius: 'var(--radius-2)',
                border: '1px solid ' + (rejectMode ? 'var(--orange-6)' : 'var(--blue-6)')
              }}>
                <Flex gap="2" align="start">
                  <FiInfo size={18} color={rejectMode ? 'var(--orange-9)' : 'var(--blue-9)'} />
                  <Text size="2" style={{ color: rejectMode ? 'var(--orange-11)' : 'var(--blue-11)' }}>
                    Вы действуете как <strong>рецензент</strong>. 
                    {!rejectMode 
                      ? ' Пожалуйста, внимательно проверьте документ перед утверждением.'
                      : ' Укажите причину отклонения документа.'}
                  </Text>
                </Flex>
              </Box>

              {/* Comment Field */}
              <Box>
                <Flex align="center" gap="2" mb="1">
                  <Text as="label" size="2" weight="medium" htmlFor="review-comment">
                    {rejectMode ? 'Причина отклонения' : 'Комментарий'}
                  </Text>
                  {!rejectMode && (
                    <Tooltip content="Необязательное поле">
                      <FiInfo size={14} color="var(--gray-9)" />
                    </Tooltip>
                  )}
                  {rejectMode && (
                    <Badge size="1" variant="solid" color="red">Обязательно</Badge>
                  )}
                </Flex>
                <TextArea
                  id="review-comment"
                  placeholder={rejectMode 
                    ? "Укажите причину отклонения документа..." 
                    : "Добавьте комментарий (необязательно)"
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={loading}
                  size="2"
                  style={rejectMode ? { borderColor: 'var(--red-7)' } : undefined}
                  autoFocus={rejectMode}
                />
              </Box>

              {/* Error */}
              {error && (
                <Box style={{ 
                  backgroundColor: 'var(--red-3)', 
                  padding: '8px 12px', 
                  borderRadius: 'var(--radius-2)',
                  border: '1px solid var(--red-6)'
                }}>
                  <Text size="2" color="red">
                    {error}
                  </Text>
                </Box>
              )}
            </Flex>
          </Box>

          <Separator size="4" />

          {/* Footer */}
          <Flex justify="between" align="center" p="4">
            <Button 
              variant="soft" 
              color="gray" 
              onClick={handleClose}
              disabled={loading}
            >
              Отмена
            </Button>
            
            <Flex gap="2">
              {rejectMode ? (
                <>
                  <Button 
                    variant="soft" 
                    color="gray" 
                    onClick={handleBackToApprove}
                    disabled={loading}
                  >
                    <Flex align="center" gap="1">
                      <FiArrowLeft size={16} />
                      <Text>Назад</Text>
                    </Flex>
                  </Button>
                  <Button 
                    color="red" 
                    onClick={handleRejectClick}
                    disabled={loading || !comment.trim()}
                  >
                    {loading ? (
                      <Flex align="center" gap="2">
                        <Spinner size="1" />
                        <Text>Отклонение...</Text>
                      </Flex>
                    ) : (
                      <Flex align="center" gap="2">
                        <FiXCircle size={16} />
                        <Text>Подтвердить отклонение</Text>
                      </Flex>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="soft" 
                    color="red" 
                    onClick={handleRejectClick}
                    disabled={loading}
                  >
                    <Flex align="center" gap="2">
                      <FiXCircle size={16} />
                      <Text>Отклонить</Text>
                    </Flex>
                  </Button>
                  <Button 
                    color="green" 
                    onClick={handleApprove}
                    disabled={loading}
                  >
                    {loading ? (
                      <Flex align="center" gap="2">
                        <Spinner size="1" />
                        <Text>Утверждение...</Text>
                      </Flex>
                    ) : (
                      <Flex align="center" gap="2">
                        <FiCheckCircle size={16} />
                        <Text>Утвердить</Text>
                      </Flex>
                    )}
                  </Button>
                </>
              )}
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Confirmation Dialog for Reject */}
      <AlertDialog.Root open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialog.Content style={{ maxWidth: 400 }}>
          <AlertDialog.Title>Подтверждение отклонения</AlertDialog.Title>
          <AlertDialog.Description size="2">
            Вы уверены, что хотите отклонить документ "{selectedDocument?.document_name}"?
            {comment && (
              <Box mt="2" p="2" style={{ backgroundColor: 'var(--gray-3)', borderRadius: 'var(--radius-2)' }}>
                <Text size="1" weight="bold">Причина:</Text>
                <Text size="1">{comment}</Text>
              </Box>
            )}
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
                color="red" 
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleReject();
                }}
              >
                Отклонить
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
};

export default DocumentReviewPanel;