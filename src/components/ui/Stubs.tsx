import { Container, Card, Flex, Text, Heading, Button } from "@radix-ui/themes";

export const AccessDenied = () => (
  <Container size="1" style={{ marginTop: '100px' }}>
    <Card>
      <Flex direction="column" align="center" gap="3" p="6">
        <Heading size="4" color="red">Доступ запрещён</Heading>
        <Text align="center" color="gray">
          У вас недостаточно прав для просмотра этого документа.
        </Text>
        <Button variant="soft" onClick={() => window.location.href = '/'}>
          Вернуться на главную
        </Button>
      </Flex>
    </Card>
  </Container>
);

export const DocumentNotFound = () => (
  <Container size="1" style={{ marginTop: '100px' }}>
    <Card>
      <Flex direction="column" align="center" gap="3" p="6">
        <Heading size="4" color="red">Документ не найден</Heading>
        <Text align="center" color="gray">
          Запрашиваемый документ не существует или был удалён.
        </Text>
        <Button variant="soft" onClick={() => window.location.href = '/'}>
          Вернуться на главную
        </Button>
      </Flex>
    </Card>
  </Container>
);
