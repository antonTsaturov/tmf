import { FC, useState, useEffect, useCallback, useContext } from 'react';
import { AdminContext } from '@/wrappers/AdminContext';
import { StudyStatus } from '@/types/types';
import { DocumentWorkFlowStatus } from '@/types/document.status';
import { logger } from '@/lib/logger';
import {
  Card,
  Flex,
  Text,
  Badge,
  Button,
  Progress,
  Callout,
  Spinner,
  Select,
  Tooltip
} from '@radix-ui/themes';
import {
  DownloadIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  FileIcon,
  UpdateIcon,
  ClockIcon,
  ArchiveIcon
} from '@radix-ui/react-icons';

interface Document {
  id: string;
  study_id: number;
  site_id: string | null;
  folder_id: string;
  folder_name: string;
  status: DocumentWorkFlowStatus;
  is_archived: boolean;
  is_deleted: boolean;
}

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
  canExport: boolean;
}

type RadixColors = 'blue' | 'green' | 'gray' | 'red' | 'purple' | 'amber';

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

const DataExport: FC = () => {
  const { studies } = useContext(AdminContext)!;
  const [selectedStudyId, setSelectedStudyId] = useState<string>('');
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingFull, setIsExportingFull] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportProgressFull, setExportProgressFull] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Get selected study
  const selectedStudy = studies.find(s => String(s.id) === selectedStudyId);

  // Check if study status is archived
  const isStudyArchived = selectedStudy?.status === StudyStatus.ARCHIVED;

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

      // Check if all documents are archived or deleted
      const activeDocuments = data.stats.total - data.stats.deleted;
      const allArchivedOrDeleted = (data.stats.archived + data.stats.deleted) === data.stats.total;

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
        canExport: allArchivedOrDeleted && activeDocuments > 0
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

  const handleExport = async (type: 'final' | 'full') => {
    if (!stats?.canExport || !selectedStudyId || !isStudyArchived) return;

    const isFull = type === 'full';
    setIsExporting(isFull ? false : true);
    setIsExportingFull(isFull ? true : false);
    
    const setProgress = isFull ? setExportProgressFull : setExportProgress;
    const setIsExportingState = isFull ? setIsExportingFull : setIsExporting;

    setProgress(0);
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const response = await fetch(`/api/documents/export?id=${selectedStudyId}&type=${type}`);

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Failed to export documents');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `study_${selectedStudyId}_${type}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      logger.error('Failed to export documents', err);
      setError('Failed to export documents');
      setProgress(0);
    } finally {
      setTimeout(() => {
        setIsExportingState(false);
        setProgress(0);
      }, 500);
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
            <DownloadIcon width="20" height="20" color="var(--gray-12)" />
            <Text size="4" weight="bold">Data Export Manager</Text>
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
                    {selectedStudy.status === StudyStatus.ARCHIVED ? (
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
              {!isStudyArchived && (
                <Callout.Root color="amber" size="1">
                  <Callout.Icon>
                    <UpdateIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    Export is only available for studies with <b>Archived</b> status.
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

            {/* Export action */}
            {stats.canExport && (
              <Callout.Root color={isStudyArchived ? 'green' : 'gray'} variant="surface">
                <Callout.Icon>
                  {isStudyArchived ? <CheckCircledIcon /> : <ClockIcon />}
                </Callout.Icon>
                <Flex direction="column" gap="2" style={{ flex: 1 }}>
                  <Callout.Text>
                    {isStudyArchived ? (
                      <>
                        All documents are archived.
                        <Text weight="medium">
                          {' '}{stats.archived} document{stats.archived !== 1 ? 's' : ''} ready for export.
                        </Text>
                      </>
                    ) : (
                      <>
                        Study is not archived. Please archive the study first.
                      </>
                    )}
                  </Callout.Text>
                  {!isStudyArchived ? (
                    <Text size="1" color="gray">
                      Change study status to <b>Archived</b> to enable export.
                    </Text>
                  ) : (
                    <Flex justify="end" gap="2">
                      <Tooltip content="Final documents with metadata">
                        <Button
                          color="green"
                          size="2"
                          onClick={() => handleExport('final')}
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <Flex gap="2" align="center">
                              <Spinner size="1" />
                              Creating Archive...
                            </Flex>
                          ) : (
                            <Flex gap="2" align="center">
                              <DownloadIcon />
                              Export Final Versions
                            </Flex>
                          )}
                        </Button>
                      </Tooltip>
                      <Tooltip content="All documents versions with metadata and audit log">
                        <Button
                          color="blue"
                          size="2"
                          onClick={() => handleExport('full')}
                          disabled={isExportingFull}
                        >
                          {isExportingFull ? (
                            <Flex gap="2" align="center">
                              <Spinner size="1" />
                              Creating Archive...
                            </Flex>
                          ) : (
                            <Flex gap="2" align="center">
                              <ArchiveIcon />
                              Export All Versions
                            </Flex>
                          )}
                        </Button>
                      </Tooltip>
                    </Flex>
                  )}
                </Flex>
              </Callout.Root>
            )}

            {/* Export progress */}
            {(isExporting || isExportingFull) && (exportProgress > 0 || exportProgressFull > 0) && (
              <Card variant="surface">
                <Flex direction="column" gap="2">
                  {isExporting && exportProgress > 0 && (
                    <>
                      <Flex justify="between" align="center">
                        <Text size="2" weight="medium">Final versions archive is being created</Text>
                        <Text size="2" color="gray">{exportProgress}%</Text>
                      </Flex>
                      <Progress value={exportProgress} color="green" size="2" radius="full" />
                    </>
                  )}
                  {isExportingFull && exportProgressFull > 0 && (
                    <>
                      <Flex justify="between" align="center">
                        <Text size="2" weight="medium">Full versions archive is being created</Text>
                        <Text size="2" color="gray">{exportProgressFull}%</Text>
                      </Flex>
                      <Progress value={exportProgressFull} color="blue" size="2" radius="full" />
                    </>
                  )}
                </Flex>
              </Card>
            )}

            {/* Warning if cannot export */}
            {!stats.canExport && stats.total > 0 && (
              <Callout.Root color="amber" variant="surface">
                <Callout.Icon>
                  <UpdateIcon />
                </Callout.Icon>
                <Callout.Text>
                  {stats.draft + stats.in_review + stats.approved > 0 ? (
                    <>
                      Cannot export: {stats.draft + stats.in_review + stats.approved} document{stats.draft + stats.in_review + stats.approved !== 1 ? 's' : ''}
                      {stats.draft > 0 && ` (${stats.draft} in draft)`}
                      {stats.in_review > 0 && ` (${stats.in_review} in review)`}
                      {stats.approved > 0 && ` (${stats.approved} approved)`}
                      . Please archive all documents first.
                    </>
                  ) : (
                    <>
                      Cannot export documents. Check study status and document statuses.
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

export default DataExport;
