import { Flex, Switch, Text } from '@radix-ui/themes';
import { useCallback } from 'react';

type DocumentMode = 'site' | 'general';

interface DocumentModeToggleProps {
  mode: DocumentMode;
  onModeChange: (mode: DocumentMode) => void;
  disabled?: boolean;
}

export const DocumentModeToggle = ({ 
  mode, 
  onModeChange, 
  disabled = false 
}: DocumentModeToggleProps) => {
  
  const handleChange = useCallback((checked: boolean) => {
    onModeChange(checked ? 'general' : 'site');
  }, [onModeChange]);

  const isGeneral = mode === 'general';

  return (
    <Flex align="center" gap="2">
      <Text size="1" color={isGeneral ? 'gray' : 'blue'}>
        Site Levels
      </Text>
      
      <Switch
        checked={isGeneral}
        onCheckedChange={handleChange}
        disabled={disabled}
        aria-label="Переключить режим документов"
      />
      
      <Text size="1" color={isGeneral ? 'blue' : 'gray'}>
        General Level
      </Text>
    </Flex>
  );
};