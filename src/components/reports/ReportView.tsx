// src/components/reports/ReportView.tsx
'use client';

import {
  Button,
  Flex,
  Table,
  Text,
  Badge,
  Dialog,
  ScrollArea,
  Box,
  Card,
  Separator,
} from '@radix-ui/themes';
import { useReportContext } from '@/wrappers/ReportContext';
import { ReportsEmptyState } from './ReportsEmptyState';
import { ReportFilters } from './ReportFilters';
import { saveAs } from 'file-saver';
import { useState, useEffect } from 'react';
import { AuditStatus, AuditLogEntry } from '@/types/audit';
import { AuditReportRequest } from '@/types/reports.type';

type ReportDataItem = {
  audit_id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  status: AuditStatus;
  site_id: string;
  study_id: string;
  ip_address: string;

};

type ReportMeta = {
  total: number;
  limit: number;
  offset: number;
};

type ReportResponse = {
  data: AuditLogEntry[];
  meta?: ReportMeta;
};

type RadixColors =
  | 'green'
  | 'red'
  | 'gray'
  | 'blue'
  | 'orange'
  | 'purple'
  | 'ruby'
  | 'brown'
  | 'crimson'
  | 'cyan'
  | 'gold'
  | 'indigo'
  | 'lime'
  | 'pink'
  | 'plum'
  | 'teal'
  | 'tomato'
  | 'violet'
  | 'yellow'
  | 'bronze'
  | 'amber'
  | 'iris'
  | 'jade'
  | 'grass'
  | 'mint'
  | 'sky'
  | undefined;


type JsonValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

type Change = {
  field: string;
  oldValue: JsonValue;
  newValue: JsonValue;
};

function buildChanges(
  oldValue?: Record<string, unknown> | null,
  newValue?: Record<string, unknown> | null
): Change[] {
  if (!oldValue || !newValue) return [];

  const keys = new Set([
    ...Object.keys(oldValue),
    ...Object.keys(newValue),
  ]);

  const changes: Change[] = [];

  keys.forEach((key) => {
    const oldVal = oldValue[key];
    const newVal = newValue[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        oldValue: oldVal as JsonValue,
        newValue: newVal as JsonValue,
      });
    }
  });

  return changes;
}

export function ChangesCell({
  oldValue,
  newValue,
}: {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(false);

  const changes = buildChanges(oldValue, newValue);

  if (!oldValue || !newValue) {
    return <Text color="gray">—</Text>;
  }

  if (changes.length === 0) {
    return <Text color="gray">No changes</Text>;
  }

  function formatValue(value: JsonValue): string {
    if (value === null || value === undefined) return '-';

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }  

  return (
    <>
      <Flex direction="column" gap="1">
        {changes.slice(0, 3).map((c) => (
          <Text key={c.field} size="1">
            <strong>{c.field}:</strong>{' '}
            <span style={{ color: '#888' }}>
              {formatValue(c.oldValue)}
            </span>{' '}
            →{' '}
            <span style={{ color: 'green' }}>
              {formatValue(c.newValue)}
            </span>
          </Text>
        ))}

        {changes.length > 3 && (
          <Text
            size="1"
            color="gray"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpen(true)}
          >
            +{changes.length - 3} more...
          </Text>
        )}
      </Flex>

      {/* 🔥 MODAL */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Content className="DialogContent">
            <Dialog.Title>
              <Text size="3" weight="bold">
                Changes
              </Text>
            </Dialog.Title>

            <Flex direction="column" gap="2" mt="3">
              {changes.map((c) => (
                <Text key={c.field} size="2">
                  <strong>{c.field}:</strong>{' '}
                  <span style={{ color: '#888' }}>
                    {formatValue(c.oldValue)}
                  </span>{' '}
                  →{' '}
                  <span style={{ color: 'green' }}>
                    {formatValue(c.newValue)}
                  </span>
                </Text>
              ))}
            </Flex>

            <Flex justify="end" style={{ marginTop: 16 }}>
              <Dialog.Close>
                <Button>Close</Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
      </Dialog.Root>
    </>
  );
}


export function ReportView() {
  const { reportContext, updateReportContext } = useReportContext();
  const { selectedReport, isLoading, data, hasGenerated } = reportContext;
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Открываем модальное окно при получении данных
  useEffect(() => {
    if (!isLoading && hasGenerated && data && data.length > 0) {
      setIsModalOpen(true);
    }
  }, [isLoading, hasGenerated, data]);


  const handleGenerate = async (payload: AuditReportRequest) => {
    if (!selectedReport) return;

    updateReportContext({ 
      isLoading: true,
      request: payload, // ✅ сохраняем
    });

    try {
      const res = await fetch('/api/reports/' + selectedReport, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ReportResponse = await res.json();

      updateReportContext({
        data: json.data || [],
        meta: json.meta || { total: 0, limit: 50, offset: 0 },
        isLoading: false,
        hasGenerated: true,
      });

    } catch (error) {
      console.error(error);

      updateReportContext({
        isLoading: false,
        hasGenerated: true,
        data: [],
        meta: { total: 0, limit: 50, offset: 0 },
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const exportToCSV = () => {
    if (!data || data.length === 0) return;

    setExporting('csv');

    try {
      const headers = [
        'ID аудита',
        'Дата и время',
        'Имя пользователя',
        'Email пользователя',
        'Действие',
        'Тип сущности',
        'ID сущности',
        'Статус',
        'ID сайта',
        'ID исследования',
        'IP адрес',
      ];

      const rows = data.map((item: AuditLogEntry) => [
        item.audit_id,
        new Date(item.created_at).toLocaleString('ru-RU'),
        item.user_name,
        item.user_email,
        item.action,
        item.entity_type,
        item.entity_id,
        item.status,
        item.site_id || '-',
        item.study_id || '-',
        item.ip_address || '-',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `audit_report_${new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-')}.csv`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(null);
    }
  };


  const exportToPDF = async () => {
    if (!data || data.length === 0) return;

    setExporting('pdf');

    try {
      const res = await fetch('/api/reports/audit/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportContext.request),
      });

      if (!res.ok) {
        throw new Error('PDF download failed');
      }

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `audit_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(null);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: string): RadixColors => {
    switch (status) {
      case 'SUCCESS':
        return 'green';
      case 'FAILURE':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getActionColor = (action: string): RadixColors => {
    switch (action) {
      case 'CREATE':
        return 'blue';
      case 'UPDATE':
        return 'orange';
      case 'DELETE':
        return 'red';
      case 'RESTORE':
        return 'purple';
      default:
        return 'gray';
    }
  };

  if (!selectedReport) {
    return <ReportsEmptyState />;
  }

  return (
    <Flex direction="column" gap="4" p="5" style={{ height: '100%', overflow: 'hidden' }}>
      <ReportFilters onGenerate={handleGenerate} />

      {/* Модальное окно для загрузки и результатов - полностью на Radix Dialog */}
      <Dialog.Root open={isModalOpen && !isLoading && hasGenerated && !!data?.length} onOpenChange={handleCloseModal}>
        <Dialog.Content style={{ maxWidth: '90vw', width: '90vw', maxHeight: '85vh', height: '85vh' }}>
          <Flex direction="column" height="100%">
            <Dialog.Title>Предварительный просмотр</Dialog.Title>
            <Separator size="4" />

            <Box flexGrow="1" mt="4" style={{ overflow: 'hidden' }}>
              <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
                <Text size="2" weight="medium">
                  Найдено записей: <strong>{data.length}</strong>
                  {(reportContext as any).meta?.total && (reportContext as any).meta.total > data.length
                    ? ` (всего: ${(reportContext as any).meta.total})`
                    : ''}
                </Text>
                <Flex gap="2">
                  <Button variant="soft" onClick={exportToCSV} disabled={exporting === 'csv'}>
                    {exporting === 'csv' ? '⏳ Экспорт...' : '📄 Экспорт CSV'}
                  </Button>
                  <Button variant="soft" onClick={exportToPDF} disabled={exporting === 'pdf'}>
                    {exporting === 'pdf' ? '⏳ Экспорт...' : '📑 Экспорт PDF'}
                  </Button>
                </Flex>
              </Flex>

              <Card variant="surface">
                <ScrollArea type="auto" style={{ height: 'calc(85vh - 180px)' }}>
                  <Table.Root variant="surface">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>ID записи</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Дата/Время</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Пользователь</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Роль</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Действие</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Название документа</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Изменения</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Новое значение</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Исследование</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Центр</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>IP адрес</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.map((row: AuditLogEntry, i: number) => (
                        <Table.Row  key={row.audit_id || i}>
                          <Table.Cell style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.audit_id}
                          </Table.Cell>
                          <Table.Cell>{formatDate(row.created_at)}</Table.Cell>
                          <Table.Cell>{row.user_name}</Table.Cell>
                          <Table.Cell>{row.user_email}</Table.Cell>
                          <Table.Cell>{row.user_role}</Table.Cell>
                          <Table.Cell>
                            <Badge color={getActionColor(row.action)}>{row.action}</Badge>
                          </Table.Cell>
                          <Table.Cell style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row.document_name}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge color={getStatusColor(row.status)}>{row.status}</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <ChangesCell oldValue={row.old_value} newValue={row.new_value} />
                          </Table.Cell>
                          <Table.Cell>{row.study_protocol || '-'}</Table.Cell>
                          <Table.Cell>{row.site_name || '-'}</Table.Cell>
                          <Table.Cell>{row.ip_address || '-'}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </ScrollArea>
              </Card>
            </Box>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Закрыть
                </Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>


      {/* Сообщение об отсутствии данных */}
      {!isLoading && hasGenerated && (!data || data.length === 0) && (
        <Card variant="surface">
          <Flex p="6" justify="center" align="center">
            <Text size="3" color="gray">
              Данные не найдены. Попробуйте изменить параметры фильтрации.
            </Text>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}