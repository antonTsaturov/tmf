'use client';

import { Heading, Button, Flex } from '@radix-ui/themes';
import { ReportType } from '@/types/reports.type';
import { ReportsEmptyState } from './ReportsEmptyState';
import { ReportFilters } from './ReportFilters';
import { useState } from 'react';

type Props = {
  reportType: ReportType | null;
};

export function ReportView({ reportType }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  if (!reportType) {
    return <ReportsEmptyState />;
  }

  const handleGenerate = async (filters: any) => {
    setLoading(true);

    const res = await fetch('/api/reports/' + reportType, {
      method: 'POST',
      body: JSON.stringify(filters),
    });

    const json = await res.json();
    setData(json.data);

    setLoading(false);
  };

  return (
    <Flex direction="column" gap="4" p="5">
      <Heading size="5">{getTitle(reportType)}</Heading>

      <ReportFilters onGenerate={handleGenerate} />

      {loading && <div>Generating report...</div>}

      {!loading && data.length === 0 && (
        <div>No data. Adjust filters.</div>
      )}

      {!loading && data.length > 0 && (
        <>
          <Flex justify="between">
            <div>{data.length} records</div>
            <Flex gap="2">
              <Button variant="soft">Export CSV</Button>
              <Button variant="soft">Export PDF</Button>
            </Flex>
          </Flex>

          <div style={{ overflow: 'auto', maxHeight: 500 }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j}>{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Flex>
  );
}

function getTitle(type: ReportType) {
  switch (type) {
    case 'audit':
      return 'Audit Log';
    case 'document-status':
      return 'Document Status';
    case 'missing-documents':
      return 'Missing Documents';
  }
}