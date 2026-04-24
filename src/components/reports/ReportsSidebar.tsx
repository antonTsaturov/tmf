// src/components/reports/ReportsSidebar.tsx
'use client';

import { Card, Text, Flex, RadioGroup, Box } from '@radix-ui/themes';
import { ReportType, FilterType, ReportFilter } from '@/types/reports.type';
import { useReportContext } from '@/wrappers/ReportContext';

const REPORTS = [
  {
    key: 'audit' as ReportType,
    title: 'Audit Log',
    description: 'Track user activity',
  },
  {
    key: 'document-status' as ReportType,
    title: 'Document Status',
    description: 'Lifecycle overview',
  },
  {
    key: 'missing-documents' as ReportType,
    title: 'Missing Documents',
    description: 'Identify gaps',
  },
] as const;

const FILTER_OPTIONS = [
  { value: 'study' as FilterType, label: 'По исследованию' },
  { value: 'country' as FilterType, label: 'По стране' },
  { value: 'center' as FilterType, label: 'По центру' },
];

export function ReportsSidebar() {
  const { reportContext, updateReportContext } = useReportContext();
  const { selectedReport, selectedFilter } = reportContext;

  const handleCardClick = (report: ReportType) => {
    if (selectedReport === report) {
      // Если уже выбран - схлопываем
      updateReportContext({
        selectedReport: null,
        selectedFilter: null,
        hasGenerated: false,
        data: [],
      });
    } else {
      // Выбираем новый отчет
      updateReportContext({
        selectedReport: report,
        selectedFilter: null,
        hasGenerated: false,
        data: [],
      });
    }
  };

  const handleFilterChange = (filterType: FilterType) => {
    const filter: ReportFilter = {
      type: filterType,
      value: '',
      label: '',
    };
    updateReportContext({
      selectedFilter: filter,
      hasGenerated: false,
      data: [],
    });
  };


  return (
    <Flex direction="column" gap="3" p="3">
      {REPORTS.map((r) => {
        const isSelected = selectedReport === r.key;
        const showFilter = isSelected;

        return (
          <Box key={r.key}>
            <Card
              onClick={() => handleCardClick(r.key)}
              style={{
                cursor: 'pointer',
                background: isSelected ? 'var(--accent-6)' : undefined,
              }}
            >
              <Flex direction="column">
                <Text weight="bold">{r.title}</Text>
                <Text size="2" color="gray">
                  {r.description}
                </Text>
              </Flex>
            </Card>

            {/* Разворачивающийся фильтр */}
            {showFilter && (
              <Box
                mt="2"
                ml="3"
                style={{
                  borderLeft: '2px solid var(--accent-5)',
                  paddingLeft: '12px',
                }}
              >
                <RadioGroup.Root
                  value={selectedFilter?.type  || undefined}
                  onValueChange={handleFilterChange}
                  size="2"
                >
                  <Flex direction="column" gap="2">
                    {FILTER_OPTIONS.map((option) => (
                      <Text as="label" size="2" key={option.value}>
                        <Flex gap="2" align="center">
                          <RadioGroup.Item value={option.value} />
                          {option.label}
                        </Flex>
                      </Text>
                    ))}
                  </Flex>
                </RadioGroup.Root>
              </Box>
            )}
          </Box>
        );
      })}
    </Flex>
  );
}