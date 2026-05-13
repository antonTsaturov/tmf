import { FolderNode } from "@/types/folder";
import { MainContext } from "@/wrappers/MainContext";
import { Box, Flex, Text, Grid, Card, ScrollArea } from "@radix-ui/themes";
import { useContext } from "react";
import { FaRegFolderOpen, FaRegFolder } from "react-icons/fa6";

const FoldersList: React.FC = () => { 
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedFolder } = context;

  // Получаем дочерние папки (исключаем корневую папку, если нужно)
  const childFolders = selectedFolder?.children?.filter(child => child.type !== 'root') || [];

  return (
    <Flex width="100%" height="100%" display="flex" direction="column">
      {/* Заголовок с информацией о папке - фиксированный */}
      <Box style={{ flexShrink: 0 }}>
        <Flex p="4" mb="0" width="100%">
          <Flex direction="column" gap="2" width="100%">
            <Flex direction="row" gap="1" align="center">
              <FaRegFolderOpen size={22}/>
              <Text size="4" weight="bold" ml="2" style={{ textTransform: 'uppercase' }}>
                {selectedFolder?.name}
              </Text>
            </Flex>
            
            <Flex direction="row" gap="1" align="center" justify="between">
              <Text size="1" color="gray">
                {childFolders.length} {childFolders.length === 1 ?
                 'подпапка' 
                 : childFolders.length >= 2 && childFolders.length <= 4 ? 'подпапки' 
                 : 'подпапок'}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <ScrollArea style={{ height: 'calc(100vh - 240px)' }}>
        {/* Плиточный режим для дочерних папок */}
        {childFolders.length > 0 ? (
          <Box p="4" pt="0">
            <Grid columns={{ initial: "1", sm: "2", md: "3", lg: "4" }} gap="4">
              {childFolders.map((folder) => (
                <Card 
                  key={folder.id} size="2" variant="surface"
                  onClick={()=>updateContext({
                    selectedFolder: folder as FolderNode
                  })}
                >
                  <Flex 
                    direction="column" 
                    gap="2" 
                    align="center" 
                    justify="start"
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minHeight: '100px',
                    }}
                  >
                    <FaRegFolder size={48} color="gray" />
                    <Text 
                      size="2" 
                      weight="medium" 
                      align="center"
                      style={{ 
                        wordBreak: 'break-word',
                        textTransform: 'uppercase',
                      }}
                    >
                      {folder.name}
                    </Text>
                    {folder.status === 'inactive' && (
                      <Text size="1" color="red">(Неактивна)</Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Grid>
          </Box>
        ) : (
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
            <Text size="2" color="gray">
              Нет вложенных папок
            </Text>
          </Flex>
        )}
      </ScrollArea>
    </Flex>
  );
};

export default FoldersList;