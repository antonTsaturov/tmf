'use client';

import { useLocale } from '@/wrappers/LocaleProvider';
import { Select, Flex, Text, Box, RadioGroup, Card } from '@radix-ui/themes';
import { GlobeIcon } from '@radix-ui/react-icons';

const LANGUAGES = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

interface LanguageSwitcherProps {
  variant?: 'select' | 'radio';
}

export function LanguageSwitcher({ variant = 'select' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();

  if (variant === 'radio') {
    return (
      <Card size="1" variant="classic" style={{minWidth: '200px'}}>
        <RadioGroup.Root value={locale} onValueChange={(val) => setLocale(val as 'ru' | 'en')}>
          {LANGUAGES.map((lang) => (
            <Flex key={lang.value} align="center" gap="1">
              <RadioGroup.Item value={lang.value} />
              <Text size="2">{lang.label}</Text>
            </Flex>
          ))}
        </RadioGroup.Root>
      </Card>
    );
  }

  return (
    <Flex align="center" gap="2">
      <Box style={{ color: 'var(--gray-11)', display: 'flex' }}>
        <GlobeIcon width="16" height="16" />
      </Box>
      <Select.Root
        value={locale} 
        onValueChange={(val) => setLocale(val as 'ru' | 'en')} 
        size="1"
      >
        <Select.Trigger variant="ghost" style={{outline: 'none'}}/>
        <Select.Content>
          {LANGUAGES.map((lang) => (
            <Select.Item key={lang.value} value={lang.value}>
              <Flex align="center" gap="2">
                <Text size="2">{lang.label}</Text>
              </Flex>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}
