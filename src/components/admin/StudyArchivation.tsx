import { FC, useState, useEffect, useCallback, useContext } from 'react';
import { AdminContext } from '@/wrappers/AdminContext';
import { useAuth } from '@/wrappers/AuthProvider';
import { StudyStatus } from '@/types/types';
import { logger } from '@/lib/utils/logger';
import {
  Card,
  Flex,
  Text,
  Badge,
  Button,
  Progress,
  Callout,
  Spinner,
  Select
} from '@radix-ui/themes';
import {
  ArchiveIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  FileIcon,
  UpdateIcon,
  ClockIcon,
} from '@radix-ui/react-icons';
import '@/styles/StudyArchivation.css';

interface DocumentStats {
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  archived: number;
  deleted: number;
  draftPercent: number;
  inReviewPercent: number;
  approvedPercent: number;
  archivedPercent: number;
  deletedPercent: number;
  canArchive: boolean;
}

type RadixColors =  'blue' | 'green' | 'gray' | 'red' | 'purple';

const statusColors: Record<StudyStatus, RadixColors> = {
  [StudyStatus.PLANNED]: 'blue',
  [StudyStatus.ONGOING]: 'green',
  [StudyStatus.COMPLETED]: 'gray',
  [StudyStatus.TERMINATED]: 'red',
  [StudyStatus.ARCHIVED]: 'purple'
};

const statusLabels: Record<StudyStatus, string> = {
  [StudyStatus.PLANNED]: 'Planned',
  [StudyStatus.ONGOING]: 'Ongoing',
  [StudyStatus.COMPLETED]: 'Completed',
  [StudyStatus.TERMINATED]: 'Terminated',
  [StudyStatus.ARCHIVED]: 'Archived'
};

const StudyArchivation: FC = () => {
  const { studies } = useContext(AdminContext)!;
  const { user } = useAuth();
  const [selectedStudyId, setSelectedStudyId] = useState<string>('');
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected study
  const selectedStudy = studies.find(s => String(s.id) === selectedStudyId);

  // Check if study status allows archivation
  const canArchiveByStatus = selectedStudy?.status === StudyStatus.COMPLETED || 
                              selectedStudy?.status === StudyStatus.TERMINATED;

  // Fetch documents for selected study
  const fetchDocuments = useCallback(async () => {
    if (!selectedStudyId) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/archive?study_id=${selectedStudyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();

      // Используем canArchive из API
      setStats({
        total: data.stats.total,
        draft: data.stats.draft,
        in_review: data.stats.in_review,
        approved: data.stats.approved,
        archived: data.stats.archived,
        deleted: data.stats.deleted,
        draftPercent: data.stats.draftPercent,
        inReviewPercent: data.stats.inReviewPercent,
        approvedPercent: data.stats.approvedPercent,
        archivedPercent: data.stats.archivedPercent,
        deletedPercent: data.stats.deletedPercent,
        canArchive: data.stats.canArchive
      });
    } catch (err) {
      logger.error('Failed to fetch documents', err);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleArchive = async () => {
    if (!stats?.canArchive || !selectedStudyId || !canArchiveByStatus) return;

    setIsArchiving(true);
    setError(null);

    try {
      const response = await fetch('/api/documents/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_id: parseInt(selectedStudyId),
          user_id: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to archive documents');
      }

      // Refresh documents after archiving
      await fetchDocuments();
    } catch (err) {
      logger.error('Failed to archive documents', err);
      setError('Failed to archive documents');
    } finally {
      setIsArchiving(false);
    }
  };

  const formatPercent = (percent: number): string => {
    return percent.toFixed(1);
  };

  return (
    <Card>
      <Flex direction="column" gap="4">
        {/* Header with Study Selector */}
        <Flex align="center" justify="between" gap="2" pb="2" style={{ borderBottom: '1px solid var(--gray-4)' }}>
          <Flex align="center" gap="2">
            <ArchiveIcon width="20" height="20" color="var(--gray-12)" />
            <Text size="4" weight="bold">Document Archivation Manager</Text>
          </Flex>
          <Select.Root value={selectedStudyId} onValueChange={setSelectedStudyId}>
            <Select.Trigger style={{ minWidth: '200px' }} />
            <Select.Content>
              <Select.Group>
                <Select.Label>Study</Select.Label>
                {studies.map((study) => (
                  <Select.Item key={study.id} value={String(study.id)}>
                    {study.protocol}
                  </Select.Item>
                ))}
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>

        {/* Study Status Info */}
        {selectedStudy && (
          <Card variant="surface">
            <Flex direction="column" gap="2">
              <Text size="1" color="gray" weight="medium">Study Status</Text>
              <Flex align="center" gap="3">
                <Badge
                  color={statusColors[selectedStudy.status]}
                  variant="solid"
                  size="2"
                >
                  <Flex gap="2" align="center">
                    {selectedStudy.status === StudyStatus.COMPLETED || 
                     selectedStudy.status === StudyStatus.TERMINATED ? (
                      <CheckCircledIcon />
                    ) : (
                      <ClockIcon />
                    )}
                    {statusLabels[selectedStudy.status]}
                  </Flex>
                </Badge>
                <Text size="1" color="gray">
                  {selectedStudy.title}
                </Text>
              </Flex>
              {!canArchiveByStatus && (
                <Callout.Root color="amber" size="1">
                  <Callout.Icon>
                    <UpdateIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Archivation is only available for studies with <b>Completed</b> or <b>Terminated</b> status.
                  </Callout.Text>
                </Callout.Root>
              )}
            </Flex>
          </Card>
        )}

        {isLoading ? (
          <Flex align="center" justify="center" gap="3" p="6">
            <Spinner size="3" />
            <Text size="2" weight="medium">Loading documents...</Text>
          </Flex>
        ) : !stats || stats.total === 0 ? (
          <Flex direction="column" align="center" justify="center" gap="3" p="6">
            <FileIcon width="48" height="48" color="var(--gray-8)" />
            <Text size="2" color="gray">
              {selectedStudyId ? 'No documents found for this study.' : 'Select a study to view documents.'}
            </Text>
          </Flex>
        ) : (
          <>

        {/* Total documents count */}
        <Card variant="surface">
          <Flex align="center" gap="3">
            <Text size="2" color="gray" weight="medium">Total Documents:</Text>
            <Text size="4" weight="bold">{stats.total}</Text>
          </Flex>
        </Card>

        {/* Status distribution - Compact grid */}
        <Card variant="surface">
          <Flex direction="column" gap="3">
            <Text size="1" color="gray" weight="medium">Status Distribution</Text>
            <Flex gap="4" wrap="wrap">
              {/* Draft */}
              <Flex direction="column" gap="1" style={{ flex: '1 1 120px' }}>
                <Flex justify="between" align="center">
                  <Badge color="gray" variant="soft" size="1">Draft</Badge>
                  <Text size="1" color="gray">{formatPercent(stats.draftPercent)}%</Text>
                </Flex>
                <Progress value={stats.draftPercent} color="gray" size="1" radius="full" />
                <Text size="1" color="gray" align="center">{stats.draft}</Text>
              </Flex>

              {/* In Review */}
              <Flex direction="column" gap="1" style={{ flex: '1 1 120px' }}>
                <Flex justify="between" align="center">
                  <Badge color="blue" variant="soft" size="1">In Review</Badge>
                  <Text size="1" color="gray">{formatPercent(stats.inReviewPercent)}%</Text>
                </Flex>
                <Progress value={stats.inReviewPercent} color="blue" size="1" radius="full" />
                <Text size="1" color="gray" align="center">{stats.in_review}</Text>
              </Flex>

              {/* Approved */}
              <Flex direction="column" gap="1" style={{ flex: '1 1 120px' }}>
                <Flex justify="between" align="center">
                  <Badge color="green" variant="soft" size="1">Approved</Badge>
                  <Text size="1" color="gray">{formatPercent(stats.approvedPercent)}%</Text>
                </Flex>
                <Progress value={stats.approvedPercent} color="green" size="1" radius="full" />
                <Text size="1" color="gray" align="center">{stats.approved}</Text>
              </Flex>

              {/* Archived */}
              <Flex direction="column" gap="1" style={{ flex: '1 1 120px' }}>
                <Flex justify="between" align="center">
                  <Badge color="amber" variant="soft" size="1">Archived</Badge>
                  <Text size="1" color="gray">{formatPercent(stats.archivedPercent)}%</Text>
                </Flex>
                <Progress value={stats.archivedPercent} color="amber" size="1" radius="full" />
                <Text size="1" color="gray" align="center">{stats.archived}</Text>
              </Flex>

              {/* Deleted */}
              <Flex direction="column" gap="1" style={{ flex: '1 1 120px' }}>
                <Flex justify="between" align="center">
                  <Badge color="red" variant="soft" size="1">
                    <Flex gap="1" align="center">
                      Deleted
                    </Flex>
                  </Badge>
                  <Text size="1" color="gray">{formatPercent(stats.deletedPercent)}%</Text>
                </Flex>
                <Progress value={stats.deletedPercent} color="red" size="1" radius="full" />
                <Text size="1" color="gray" align="center">{stats.deleted}</Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* Error message */}
        {error && (
          <Callout.Root color="red" variant="surface">
            <Callout.Icon>
              <CrossCircledIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {/* Archive action */}
        {stats.canArchive && (
          <Callout.Root color={canArchiveByStatus && stats.approved > 0 ? 'green' : 'gray'} variant="surface">
            <Callout.Icon>
              {canArchiveByStatus && stats.approved > 0 ? <CheckCircledIcon /> : <ClockIcon />}
            </Callout.Icon>
            <Flex direction="column" gap="2" style={{ flex: 1 }}>
              <Callout.Text>
                {stats.approved > 0 ? (
                  <>
                    All documents are approved or archived.
                    <Text weight="medium">
                      {' '}{stats.approved} document{stats.approved !== 1 ? 's' : ''} ready for archivation.
                    </Text>
                  </>
                ) : (
                  <>
                    All active documents are already archived.
                    {stats.deleted > 0 && (
                      <Text weight="medium">
                        {' '}{stats.deleted} deleted document{stats.deleted !== 1 ? 's' : ''} will not be archived.
                      </Text>
                    )}
                  </>
                )}
              </Callout.Text>
              {!canArchiveByStatus ? (
                <Text size="1" color="gray">
                  Change study status to <b>Completed</b> or <b>Terminated</b> to enable archivation.
                </Text>
              ) : stats.approved > 0 ? (
                <Flex justify="end" gap="2">
                  <Button
                    color="green"
                    size="2"
                    onClick={handleArchive}
                    disabled={isArchiving}
                  >
                    {isArchiving ? (
                      <Flex gap="2" align="center">
                        <Spinner size="1" />
                        Archiving...
                      </Flex>
                    ) : (
                      <Flex gap="2" align="center">
                        <ArchiveIcon />
                        Archive Approved Documents
                      </Flex>
                    )}
                  </Button>
                </Flex>
              ) : (
                <Text size="1" color="gray">
                  No documents need archivation.
                </Text>
              )}
            </Flex>
          </Callout.Root>
        )}

        {/* Warning if cannot archive */}
        {!stats.canArchive && stats.total > 0 && (
          <Callout.Root color="amber" variant="surface">
            <Callout.Icon>
              <UpdateIcon />
            </Callout.Icon>
            <Callout.Text>
              {stats.draft + stats.in_review > 0 ? (
                <>
                  Cannot archive: {stats.draft + stats.in_review} document{stats.draft + stats.in_review !== 1 ? 's' : ''}
                  {stats.draft > 0 && ` (${stats.draft} in draft)`}
                  {stats.in_review > 0 && ` (${stats.in_review} in review)`}
                  . Please approve all documents first.
                </>
              ) : stats.deleted > 0 && stats.approved + stats.archived === stats.total - stats.deleted ? (
                <>
                  All active documents are ready for archivation.
                  {stats.deleted} deleted document{stats.deleted !== 1 ? 's' : ''} will not be archived.
                </>
              ) : (
                <>
                  Cannot archive documents. Check study status and document statuses.
                  {stats.deleted > 0 && ` (${stats.deleted} deleted)`}
                </>
              )}
            </Callout.Text>
          </Callout.Root>
        )}
          </>
        )}
      </Flex>
    </Card>
  );
};

export default StudyArchivation;
