// components/SubmitToReviewPanel.tsx
import React, { useState, useEffect, useContext } from 'react';
import { 
  Dialog, 
  Flex, 
  Text, 
  Button, 
  Box, 
  Card,
  Avatar,
  Badge,
  TextField,
  TextArea,
  RadioGroup,
  Spinner,
  Separator,
  ScrollArea,
  IconButton,
  Tooltip
} from '@radix-ui/themes';
import { 
  FiX, 
  FiSend, 
  FiUser, 
  FiSearch,
  FiFileText,
  FiInfo
} from 'react-icons/fi';
import { ROLE_CONFIG, StudyUser, UserRole } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';
import { useDocumentToReview } from '@/hooks/useDocumentToReview';
import { useAuth } from "@/wrappers/AuthProvider";
import { useNotification } from '@/wrappers/NotificationContext';
import { Document } from '@/types/document';

interface SubmitToReviewPanelProps {
  studyId: number;
  siteId: string | number;
  onSuccess?: (updatedDoc: Document) => void;
}


const SubmitToReviewPanel: React.FC<SubmitToReviewPanelProps> = ({ studyId, siteId, onSuccess }) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [comment, setComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedDocument, isSubmittingToReview } = context;
  const [reviewers, setReviewers] = useState<StudyUser[]>([]);
  const { user } = useAuth()!;

  const { submitting, submitForReview } = useDocumentToReview();

  const document = selectedDocument;
  const isOpen = isSubmittingToReview;

  // Загрузка доступных рецензентов
  useEffect(() => {
    
    const loadReviewers = async () => {
      if (!isOpen || !document || !studyId || !siteId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/users/reviewers?studyId=${studyId}&siteId=${siteId}&role=${UserRole.STUDY_MANAGER}`
        );

        if (!response.ok) {
          throw new Error('Failed to load reviewers');
        }

        const data = await response.json();
        setReviewers(data.users || []);
        
        // Автоматически выбираем первого, если есть
        if (data.users?.length > 0) {
          setSelectedReviewer(data.users[0].id);
        }
      } catch (err) {
        console.error('Error loading reviewers:', err);
        setError('Не удалось загрузить список рецензентов');
      } finally {
        setLoading(false);
      }
    };

    loadReviewers();
  }, [isOpen, document, studyId, siteId]);

  const handleSubmit = async () => {
    if (!selectedReviewer || !user) {
      setError('Выберите рецензента');
      return;
    }

    setError(null);

    try {
      if (selectedDocument?.id) {
        const result = await submitForReview(
          selectedDocument?.id, 
          selectedReviewer, 
          comment.trim(), 
          String(user?.id), 
          String(user?.role)
        );
        
        if (result) {
          addNotification('success', 'Документ отправлен на ревью');
          if (typeof result === 'object' && result !== null && onSuccess) {
            onSuccess(result); 
          }
          updateContext({ isSubmittingToReview: false });
        }
      }
    } catch (err) {
      addNotification('error', 'Ошибка при отправке на ревью');
      console.error('Error submitting for review:', err);
      setError('Ошибка при отправке на ревью');
    }
  };

  const handleClose = () => {
    updateContext({ isSubmittingToReview: false });
    setSearchTerm('');
    setComment('');
    setError(null);
  };

  const filteredReviewers = reviewers.filter(reviewer =>
    reviewer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reviewer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: UserRole): string => {
    const config = ROLE_CONFIG[role];
    return config?.color || 'gray';
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
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
              <FiSend size={20} />
            </Box>
            <Dialog.Title size="4" style={{ margin: 0 }}>
              Отправить на ревью
            </Dialog.Title>
          </Flex>
          <Dialog.Close>
            <IconButton variant="ghost" size="2">
              <FiX />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {/* Document Info Card */}
        {document && (
          <Box p="4">
            <Card size="1" variant="surface">
              <Flex gap="3" align="start">
                <Box className="rt-AvatarRoot" style={{ width: 40, height: 40 }}>
                  <FiFileText size={24} />
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="3" weight="bold">
                    {document.document_name}
                  </Text>
                  <Flex gap="2" mt="1" align="center">
                    <Badge size="1" variant="soft" color="gray">
                      Версия: {document.document_number || '1'}
                    </Badge>
                    <Badge size="1" variant="soft" color="blue">
                      Статус: {document.status === 'draft' ? 'Черновик' : document.status}
                    </Badge>
                  </Flex>
                </Box>
              </Flex>
            </Card>
          </Box>
        )}

        <Separator size="4" />

        {/* Content */}
        <Box p="4">
          <Flex direction="column" gap="4">
            {/* Search */}
            <Box>
              <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
                Поиск рецензента
              </Text>
              <TextField.Root
                placeholder="Поиск по имени или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading || submitting}
              >
                <TextField.Slot>
                  <FiSearch size={16} />
                </TextField.Slot>
              </TextField.Root>
            </Box>

            {/* Reviewers List */}
            <Box>
              <Flex justify="between" align="center" mb="2">
                <Text size="2" weight="medium">Доступные рецензенты</Text>
                <Badge size="1" variant="soft" color="blue">
                  {filteredReviewers.length} из {reviewers.length}
                </Badge>
              </Flex>

              <ScrollArea type="always" scrollbars="vertical" style={{ height: 140 }}>
                <Box pr="3">
                  {loading ? (
                    <Flex direction="column" align="center" justify="center" py="6" gap="2">
                      <Spinner size="2" />
                      <Text size="2" color="gray">Загрузка рецензентов...</Text>
                    </Flex>
                  ) : filteredReviewers.length === 0 ? (
                    <Flex direction="column" align="center" justify="center" py="6" gap="2">
                      <FiUser size={32} color="var(--gray-8)" />
                      <Text size="2" color="gray" align="center">
                        {reviewers.length === 0 
                          ? 'Нет доступных рецензентов'
                          : 'Ничего не найдено'}
                      </Text>
                      {reviewers.length === 0 && (
                        <Text size="1" color="gray" align="center">
                          Убедитесь, что в исследовании и центре<br />
                          есть пользователи с ролью STUDY_MANAGER
                        </Text>
                      )}
                    </Flex>
                  ) : (
                    <RadioGroup.Root
                      value={selectedReviewer}
                      onValueChange={setSelectedReviewer}
                    >
                      <Flex direction="column" gap="2">
                        {filteredReviewers.map(reviewer => (
                          <Card key={reviewer.id} size="1" variant="surface">
                            <RadioGroup.Item value={reviewer.id}>
                              <Flex gap="3" align="start">
                                <Avatar
                                  size="2"
                                  fallback={reviewer.name.charAt(0).toUpperCase()}
                                  color="blue"
                                />
                                <Box style={{ flex: 1 }}>
                                  <Flex justify="between" align="center">
                                    <Text size="2" weight="bold">
                                      {reviewer.name}
                                    </Text>
                                  </Flex>
                                  <Text size="1" color="gray">
                                    {reviewer.email}
                                  </Text>
                                  <Flex gap="1" mt="2" wrap="wrap">
                                    {reviewer.role.map((role: UserRole) => {
                                      const config = ROLE_CONFIG[role];
                                      return config ? (
                                        <Badge
                                          key={role}
                                          size="1"
                                          variant="soft"
                                          color={getRoleColor(role) as any}
                                        >
                                          {config.label}
                                        </Badge>
                                      ) : null;
                                    })}
                                  </Flex>
                                </Box>
                              </Flex>
                            </RadioGroup.Item>
                          </Card>
                        ))}
                      </Flex>
                    </RadioGroup.Root>
                  )}
                </Box>
              </ScrollArea>
            </Box>

            {/* Comment */}
            <Box>
              <Flex align="center" gap="2" mb="1">
                <Text as="label" size="2" weight="medium" htmlFor="review-comment">
                  Комментарий
                </Text>
                <Tooltip content="Необязательное поле. Добавьте пояснения для рецензента">
                  <FiInfo size={14} color="var(--gray-9)" />
                </Tooltip>
              </Flex>
              <TextArea
                id="review-comment"
                placeholder="Добавьте комментарий для рецензента..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
                size="2"
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
        <Flex justify="end" gap="3" p="4">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={submitting}>
              Отмена
            </Button>
          </Dialog.Close>
          <Button
            onClick={handleSubmit}
            disabled={!selectedReviewer || loading || submitting}
            size="2"
          >
            {submitting ? (
              <Flex align="center" gap="2">
                <Spinner size="1" />
                <Text>Отправка...</Text>
              </Flex>
            ) : (
              <Flex align="center" gap="2">
                <FiSend size={16} />
                <Text>Отправить на ревью</Text>
              </Flex>
            )}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default SubmitToReviewPanel;