'use client';

import { Card, Text, Flex } from '@radix-ui/themes';
import { ReportType } from '@/types/reports.type';


type Props = {
  selected: ReportType | null;
  onSelect: (type: ReportType) => void;
};

const REPORTS = [
  {
    key: 'audit',
    title: 'Audit Log',
    description: 'Track user activity',
  },
  {
    key: 'document-status',
    title: 'Document Status',
    description: 'Lifecycle overview',
  },
  {
    key: 'missing-documents',
    title: 'Missing Documents',
    description: 'Identify gaps',
  },
] as const;

export function ReportsSidebar({ selected, onSelect }: Props) {
  return (
    <Flex direction="column" gap="3" p="3">
      {REPORTS.map((r) => (
        <Card
          key={r.key}
          onClick={() => onSelect(r.key)}
          style={{
            cursor: 'pointer',
            background:
              selected === r.key ? 'var(--accent-3)' : undefined,
          }}
        >
          <Text weight="bold">{r.title}</Text>
          <Text size="2" color="gray">
            {r.description}
          </Text>
        </Card>
      ))}
    </Flex>
  );
}