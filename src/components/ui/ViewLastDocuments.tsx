// src/components/ui/ViewLastDocuments.tsx
'use client'
import { useContext } from "react";
import { MainContext } from "@/wrappers/MainContext";
import { Badge, Box, Flex, Section, Spinner, Table, Text } from "@radix-ui/themes";
import { FiFolder, FiUser, FiCalendar } from "react-icons/fi";
import { FileIcon } from "react-file-icon";
import { ViewLevel } from "@/types/types";
import { useLastDocuments } from "@/hooks/useLastDocuments";
import { useFolderName } from "@/hooks/useFolderName";


interface LastDocsProps {
  level: ViewLevel;
}

export function ViewLastDocuments({ level }: LastDocsProps) {
  const { context } = useContext(MainContext)!;
  const { currentStudy, currentCountry, currentSite, currentLevel } = context;
  const getFolderName = useFolderName();

  // if (!currentStudy) {
  //   return null;
  // }
  const siteId = currentSite?.id;
  const country = currentLevel === ViewLevel.COUNTRY ? currentCountry : undefined;
  const studyId = currentStudy?.id;

  const { data, isLoading, error } = useLastDocuments({
    studyId: studyId as unknown as number,
    viewLevel: level as ViewLevel,
    country: country,
    siteId: siteId as unknown as string,
    depth: 5,
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <Box width="100%">
      {/* Header */}
      <Box style={{ flexShrink: 0 }}>
        <Section size="1" p="4" mb="0" style={{display: "flex",justifyContent:"space-between", alignItems:"start"}}>
          <Flex direction="column" gap="1" width="50%" style={{ borderBottom: '1px solid var(--gray-5)' }}>
            <Text size="4" weight="bold" ml="2" style={{ textTransform: 'uppercase' }}>
              Последние добавленные документы
            </Text>
          </Flex>
        </Section>
      </Box>

      {/* Documents */}
      <Box p="4" style={{ flex: 1, overflow: 'auto', height: 'calc(90vh - 180px)' }}>
        {isLoading ? (
          <Flex justify="center" align="center" py="8" style={{ height: '100%' }}>
            <Spinner size="3" />
          </Flex>
        ) : error ? (
          <Flex justify="center" align="center" py="8">
            <Text color="red">Ошибка загрузки</Text>
          </Flex>
        ) : !data || data.length === 0 ? (
          <Flex direction="column" align="center" gap="4" py="8">
            <Text size="4" weight="medium" color="gray">
              Список пуст
            </Text>
            <Text size="2" color="gray">
              Документы в этот раздел еще не добавлены
            </Text>
          </Flex>
        ) : (
          <Table.Root>
            <Table.Body>
              {data.map((link: any, index: number) => (
                <Table.Row 
                  key={link.id + index}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    verticalAlign: 'middle'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--gray-3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <Table.Cell>
                    <Flex direction="row" gap="3" align="center">
                      <Box style={{ width: 24, flexShrink: 0 }}>
                        <FileIcon extension="pdf" labelColor="#D93831" type="acrobat" />
                      </Box>

                      <Flex direction="column" gap="1">
                        <Text weight="bold" size="2">
                          {link.document_name}
                        </Text>

                        <Box 
                          style={{ 
                            display: 'grid',
                            gridTemplateColumns: 'minmax(200px, 350px) minmax(170px, 300px) minmax(150px, 200px)',
                            gap: '24px',
                            alignItems: 'center'
                          }}
                        >
                          {/* Folder */}
                          <Flex align="center" gap="2">
                            <FiFolder size={14} color="var(--gray-9)" style={{ flexShrink: 0 }} />
                            <Text size="2" truncate>{getFolderName(link.folder_id)}</Text>
                          </Flex>

                          {/* User */}
                          <Flex align="center" gap="2">
                            <FiUser size={14} color="var(--gray-9)" style={{ flexShrink: 0 }} />
                            <Text size="2" truncate>Uploaded by: {link.uploaded_by || "-"}</Text>
                          </Flex>

                          {/* Date */}
                          <Flex align="center" gap="2">
                            <FiCalendar size={14} color="var(--gray-9)" style={{ flexShrink: 0 }} />
                            <Text size="2" truncate>{formatDate(link.uploaded_at)}</Text>
                          </Flex>
                        </Box>
                      </Flex>
                    </Flex>
                  </Table.Cell>

                  <Table.Cell />
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Box>
  );
}