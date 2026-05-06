import { 
  Flex, 
  Text, 
  Box, 
} from '@radix-ui/themes';
import { 
  FiUpload
} from 'react-icons/fi';

interface DragAndDropOverlayProps {
  dragover: boolean;
}

export const DragAndDropOverlay: React.FC<DragAndDropOverlayProps> = ({ dragover }) => {

  if (!dragover) return null;

  return (
    <>
      {dragover && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'var(--blue-3)',
            border: '2px dashed var(--blue-7)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          <Flex direction="column" align="center" gap="2">
            <FiUpload size={48} color="var(--blue-8)" />
            <Text size="5" weight="bold" style={{color: "var(--blue-8)"}}>
              Перетащите файл для загрузки
            </Text>
          </Flex>
        </Box>
      )}
    </>
  )
}

export default DragAndDropOverlay;