import { Flex, Spinner, Text } from "@radix-ui/themes";


export const PageLoading = () => (
  <Flex p="3" justify="center" align="center" gap="2" height="100vh">
    <Spinner size="3" style={{ color: 'gray' }} />
    <Text size="1" weight="medium">Загрузка...</Text>
  </Flex>
);