import { Box, Flex } from '@radix-ui/themes';

export const SidebarSkeleton = () => {

  return (
    <Box p="4" width="100%">
      <Flex direction="column" gap="4" width="100%" style={{ opacity: 0.3, filter: 'grayscale(1)' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <Flex key={i} align="center" gap="2" >
            <Box style={{ width: '16px', height: '16px', backgroundColor: '#ccc', borderRadius: '3px' }} />
            <Box style={{ width: `100%`, height: '8px', backgroundColor: '#eee', borderRadius: '4px' }} />
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};