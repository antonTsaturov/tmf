'use client';

import { Button, Flex, TextField } from '@radix-ui/themes';
import { useState } from 'react';

export function ReportFilters({
  onGenerate,
}: {
  onGenerate: (filters: any) => void;
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <Flex gap="3" align="end">
      <div>
        <div>Date from</div>
        <TextField.Root
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>

      <div>
        <div>Date to</div>
        <TextField.Root
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      <Button onClick={() => onGenerate({ dateFrom, dateTo })}>
        Generate
      </Button>
    </Flex>
  );
}