'use client';

import { Flex, Text } from '@radix-ui/themes';

export function ReportsEmptyState() {
  return (
    <Flex
      align="center"
      justify="center"
      style={{ height: '100%' }}
      direction="column"
      gap="3"
    >
      <Text size="5">Select a report</Text>
      <Text color="gray">
        Choose a report from the left panel to get started
      </Text>
    </Flex>
  );
}