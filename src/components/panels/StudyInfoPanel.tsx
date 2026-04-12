// components/StudyInfoPanel.tsx
import React, { useContext, useState, useEffect } from "react";
import {
  Dialog,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  IconButton,
  Separator,
  Spinner,
  Table,
  Progress,
  Tabs
} from '@radix-ui/themes';
import {
  FiX,
  FiInfo,
  FiFolder,
  FiMapPin,
  FiUsers,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiArchive,
  FiTrash2,
  FiAlertCircle,
  FiEdit3
} from 'react-icons/fi';
import { MainContext } from "@/wrappers/MainContext";
import { StudySite } from "@/types/types";
import { logger } from '@/lib/utils/logger';
import { getTable } from '@/lib/api/fetch';
import { Tables } from '@/lib/db/schema';

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

interface StudyInfoPanelProps {
  onArchive?: () => void;
}

const StudyInfoPanel: React.FC<StudyInfoPanelProps> = () => {

  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy, isStudyInfoPanelOpen } = context;

  const [loading, setLoading] = useState(false);
  const [documentStats, setDocumentStats] = useState<DocumentStats | null>(null);
  const [studySites, setStudySites] = useState<StudySite[]>([]);
  const [selectedSiteTab, setSelectedSiteTab] = useState<string>('');

  // Load all sites for the current study
  useEffect(() => {
    if (!currentStudy?.id) {
      setStudySites([]);
      setSelectedSiteTab('');
      return;
    }

    const loadSites = async () => {
      try {
        const allSites = await getTable(Tables.SITE);
        const filteredSites = (allSites as StudySite[]).filter(
          (site: StudySite) => Number(site.study_id) === Number(currentStudy.id)
        );
        setStudySites(filteredSites);
        if (filteredSites.length > 0) {
          setSelectedSiteTab(String(filteredSites[0].id));
        }
      } catch (error) {
        logger.error('Error loading sites for study', error);
      }
    };

    loadSites();
  }, [currentStudy?.id]);

  //const selectedSite = studySites.find(s => String(s.id) === selectedSiteTab);

  // Загрузка статистики документов
  useEffect(() => {
    const fetchDocumentStats = async () => {
      if (!currentStudy?.id) {
        setDocumentStats(null);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/documents/stats?study_id=${currentStudy.id}`);
        if (response.ok) {
          const data = await response.json();
          setDocumentStats(data.stats);
        }
      } catch (error) {
        logger.error('Error fetching document stats', error);
      } finally {
        setLoading(false);
      }
    };

    if (isStudyInfoPanelOpen) {
      fetchDocumentStats();
    }
  }, [currentStudy?.id, isStudyInfoPanelOpen]);

  // Статус исследования
  const getStudyStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'green';
      case 'completed': return 'blue';
      case 'terminated': return 'red';
      case 'pending': return 'orange';
      default: return 'gray';
    }
  };

  const assignedSitesCount = currentStudy?.sites?.length || 0;
  const countriesCount = new Set(currentStudy?.countries || []).size;

  if (!isStudyInfoPanelOpen) return null;

  return (
    <>
      <Dialog.Root
        open={isStudyInfoPanelOpen}
        onOpenChange={(open) => {
          if (!open) {
            updateContext({ isStudyInfoPanelOpen: false });
          }
        }}
      >
        <Dialog.Content style={{ maxWidth: 700, padding: 0 }}>
          {!currentStudy ? (
            <Flex justify="center" align="center" p="5">
              <Text size="2" color="gray">No study selected</Text>
            </Flex>
          ) : (
            <>
        {/* Header */}
        <Flex
          justify="between"
          align="center"
          p="4"
          style={{ borderBottom: '1px solid var(--gray-5)' }}
        >
          <Flex align="center" gap="3" justify="center">
            <FiInfo size={18} color="var(--blue-9)" />
            <Dialog.Title size="3" style={{ marginTop: 13 }}>
              About study
            </Dialog.Title>
          </Flex>
          <Dialog.Close>
            <IconButton variant="ghost" size="2">
              <FiX />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {/* Content */}
        <Box p="5" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Flex direction="column" gap="5">
            
            {/* Study Overview */}
            <Card size="2" variant="surface">
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2" mb="1">
                  <FiFolder size={18} color="var(--blue-9)" />
                  <Text size="3" weight="bold">Study Overview</Text>
                </Flex>
                
                <Separator size="4" />

                <Table.Root variant="surface">
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell width="40%">
                        <Text size="2" color="gray">Study title</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" weight="medium">{currentStudy.title}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell width="40%">
                        <Text size="2" color="gray">Protocol</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" weight="medium">{currentStudy.protocol}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Text size="2" color="gray">Sponsor</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2">{currentStudy.sponsor || 'N/A'}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Text size="2" color="gray">CRO</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2">{currentStudy.cro || 'N/A'}</Text>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Text size="2" color="gray">Status</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge size="1" color={getStudyStatusColor(currentStudy.status)}>
                          {currentStudy.status}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>
                        <Text size="2" color="gray">Countries</Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap="1" wrap="wrap">
                          {currentStudy.countries?.map((country, idx) => (
                            <Badge key={idx} size="1" variant="soft" color="gray">
                              {country}
                            </Badge>
                          ))}
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Root>
              </Flex>
            </Card>

            {/* Site Information */}
            {studySites.length > 0 && (
              <Card size="2" variant="surface">
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="2" mb="1">
                    <FiMapPin size={18} color="var(--purple-9)" />
                    <Text size="3" weight="bold">Sites Information</Text>
                  </Flex>

                  <Separator size="4" />

                  <Tabs.Root value={selectedSiteTab} onValueChange={setSelectedSiteTab}>
                    <Tabs.List>
                      {studySites.map((site) => (
                        <Tabs.Trigger key={site.id} value={String(site.id)}>
                          <Text size="1">{site.name}</Text>
                        </Tabs.Trigger>
                      ))}
                    </Tabs.List>

                    {studySites.map((site) => (
                      <Tabs.Content key={site.id} value={String(site.id)}>
                        <Flex direction="column" gap="3" mt="3">
                          <Table.Root variant="surface">
                            <Table.Body>
                              <Table.Row>
                                <Table.Cell width="40%">
                                  <Text size="2" color="gray">Site Name</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text size="2" weight="medium">{site.name}</Text>
                                </Table.Cell>
                              </Table.Row>
                              <Table.Row>
                                <Table.Cell>
                                  <Text size="2" color="gray">Site Number</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text size="2">№{site.number}</Text>
                                </Table.Cell>
                              </Table.Row>
                              <Table.Row>
                                <Table.Cell>
                                  <Text size="2" color="gray">Location</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Flex gap="2" align="center">
                                    <FiMapPin size={14} color="var(--gray-9)" />
                                    <Text size="2">{site.city || 'N/A'}, {site.country || 'N/A'}</Text>
                                  </Flex>
                                </Table.Cell>
                              </Table.Row>
                              <Table.Row>
                                <Table.Cell>
                                  <Text size="2" color="gray">Principal Investigator</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Text size="2">{site.principal_investigator || 'N/A'}</Text>
                                </Table.Cell>
                              </Table.Row>
                              <Table.Row>
                                <Table.Cell>
                                  <Text size="2" color="gray">Status</Text>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge size="1" color={site.status === 'opened' ? 'green' : 'gray'}>
                                    {site.status}
                                  </Badge>
                                </Table.Cell>
                              </Table.Row>
                            </Table.Body>
                          </Table.Root>
                        </Flex>
                      </Tabs.Content>
                    ))}
                  </Tabs.Root>
                </Flex>
              </Card>
            )}

            {/* Study Statistics */}
            <Card size="2" variant="surface">
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2" mb="1">
                  <FiFileText size={18} color="var(--amber-9)" />
                  <Text size="3" weight="bold">Document Statistics</Text>
                </Flex>
                
                <Separator size="4" />

                {loading ? (
                  <Flex justify="center" align="center" p="4" gap="2">
                    <Spinner size="2" />
                    <Text size="2" color="gray">Loading statistics...</Text>
                  </Flex>
                ) : documentStats ? (
                  <Flex direction="column" gap="4">
                    {/* Total Card */}
                    <Card size="1" variant="surface">
                      <Flex direction="row" align="center" gap="2" justify="between">
                        <Flex align="center" gap="2">
                          <FiFileText size={18} color="var(--gray-9)" />
                          <Text size="2" weight="medium" color="gray">Total Documents</Text>
                        </Flex>
                        <Text size="4" weight="bold">{documentStats.total}</Text>
                      </Flex>
                    </Card>

                    {/* Status Cards */}
                    <Flex gap="3" wrap="wrap">
                      <Card size="1" style={{ flex: 1, minWidth: 100 }}>
                        <Flex direction="column" align="center" gap="1">
                          <FiEdit3 size={20} color="var(--gray-9)" />
                          <Text size="4" weight="bold">{documentStats.draft}</Text>
                          <Text size="1" color="gray">Draft</Text>
                        </Flex>
                      </Card>
                      <Card size="1" style={{ flex: 1, minWidth: 100 }}>
                        <Flex direction="column" align="center" gap="1">
                          <FiClock size={20} color="var(--orange-9)" />
                          <Text size="4" weight="bold">{documentStats.in_review}</Text>
                          <Text size="1" color="gray">In Review</Text>
                        </Flex>
                      </Card>
                      <Card size="1" style={{ flex: 1, minWidth: 100 }}>
                        <Flex direction="column" align="center" gap="1">
                          <FiCheckCircle size={20} color="var(--green-9)" />
                          <Text size="4" weight="bold">{documentStats.approved}</Text>
                          <Text size="1" color="gray">Approved</Text>
                        </Flex>
                      </Card>
                      <Card size="1" style={{ flex: 1, minWidth: 100 }}>
                        <Flex direction="column" align="center" gap="1">
                          <FiArchive size={20} color="var(--blue-9)" />
                          <Text size="4" weight="bold">{documentStats.archived}</Text>
                          <Text size="1" color="gray">Archived</Text>
                        </Flex>
                      </Card>
                      <Card size="1" style={{ flex: 1, minWidth: 100 }}>
                        <Flex direction="column" align="center" gap="1">
                          <FiTrash2 size={20} color="var(--red-9)" />
                          <Text size="4" weight="bold">{documentStats.deleted}</Text>
                          <Text size="1" color="gray">Deleted</Text>
                        </Flex>
                      </Card>
                    </Flex>

                    {/* Progress Bars */}
                    <Flex direction="column" gap="3">
                      <Flex direction="column" gap="1">
                        <Flex justify="between">
                          <Text size="2" color="gray">Draft</Text>
                          <Text size="2" weight="medium">{documentStats.draftPercent.toFixed(1)}%</Text>
                        </Flex>
                        <Progress value={documentStats.draftPercent} size="1" color="gray" />
                      </Flex>

                      <Flex direction="column" gap="1">
                        <Flex justify="between">
                          <Text size="2" color="gray">In Review</Text>
                          <Text size="2" weight="medium">{documentStats.inReviewPercent.toFixed(1)}%</Text>
                        </Flex>
                        <Progress value={documentStats.inReviewPercent} size="1" color="orange" />
                      </Flex>

                      <Flex direction="column" gap="1">
                        <Flex justify="between">
                          <Text size="2" color="gray">Approved</Text>
                          <Text size="2" weight="medium">{documentStats.approvedPercent.toFixed(1)}%</Text>
                        </Flex>
                        <Progress value={documentStats.approvedPercent} size="1" color="green" />
                      </Flex>

                      <Flex direction="column" gap="1">
                        <Flex justify="between">
                          <Text size="2" color="gray">Archived</Text>
                          <Text size="2" weight="medium">{documentStats.archivedPercent.toFixed(1)}%</Text>
                        </Flex>
                        <Progress value={documentStats.archivedPercent} size="1" color="blue" />
                      </Flex>

                      <Flex direction="column" gap="1">
                        <Flex justify="between">
                          <Text size="2" color="gray">Deleted</Text>
                          <Text size="2" weight="medium">{documentStats.deletedPercent.toFixed(1)}%</Text>
                        </Flex>
                        <Progress value={documentStats.deletedPercent} size="1" color="red" />
                      </Flex>
                    </Flex>

                    {!documentStats.canArchive && documentStats.draft > 0 && (
                      <Flex
                        p="3"
                        gap="2"
                        align="center"
                        style={{
                          backgroundColor: 'var(--amber-3)',
                          borderRadius: 'var(--radius-2)',
                          border: '1px solid var(--amber-6)'
                        }}
                      >
                        <FiAlertCircle size={18} color="var(--amber-9)" />
                        <Text size="2" color="amber">
                          {documentStats.draft} document(s) are still in draft status
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                ) : (
                  <Flex justify="center" align="center" p="4">
                    <Text size="2" color="gray">No statistics available</Text>
                  </Flex>
                )}
              </Flex>
            </Card>

            {/* Additional Info */}
            <Card size="2" variant="surface">
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2" mb="1">
                  <FiUsers size={18} color="var(--cyan-9)" />
                  <Text size="3" weight="bold">Additional Information</Text>
                </Flex>
                
                <Separator size="4" />

                <Flex gap="4" wrap="wrap">
                  <Flex direction="column" gap="1">
                    <Text size="2" color="gray">Total Sites</Text>
                    <Text size="4" weight="bold">{assignedSitesCount}</Text>
                  </Flex>
                  <Flex direction="column" gap="1">
                    <Text size="2" color="gray">Countries</Text>
                    <Text size="4" weight="bold">{countriesCount}</Text>
                  </Flex>
                  {currentStudy.users && (
                    <Flex direction="column" gap="1">
                      <Text size="2" color="gray">Team Members</Text>
                      <Text size="4" weight="bold">
                        {Array.isArray(currentStudy.users) ? currentStudy.users.length : 'N/A'}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Flex>
            </Card>

          </Flex>
        </Box>
        </>
        )}
      </Dialog.Content>
    </Dialog.Root>
    </>
  );
};

export default StudyInfoPanel;
