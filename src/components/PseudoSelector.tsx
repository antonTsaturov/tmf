import { FC, useState } from "react";
import '../styles/PresudoSelector.css';
import { UserRole, StudySite, SiteStatus, Study, StudyUser, ROLE_CONFIG } from "@/types/types";
import { COUNTRIES } from "@/lib/config/constants";
import { logger } from '@/lib/utils/logger';
import {
  Flex,
  Text,
  Badge,
  Button,
  DropdownMenu,
  TextField,
  Separator,
  ScrollArea,
  Box,
} from '@radix-ui/themes';
import {
  CheckIcon,
  ChevronDownIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';

// Конфигурация для статусов центров
const SITE_STATUS_CONFIG = {
  [SiteStatus.OPENED]: { label: 'Opened', color: '#51cf66', icon: '🟢' },
  [SiteStatus.PLANNED]: { label: 'Planned', color: '#ff922b', icon: '🟡' },
  [SiteStatus.CLOSED]: { label: 'Closed', color: '#ff6b6b', icon: '🔒' },
  [SiteStatus.FROZEN]: { label: 'Frozen', color: '#3b5bff', icon: '❄️' },
};

// Типы для селектора
export type SelectorType = 'country' | 'role' | 'site' | 'study'; 

// Изменено: для сайтов храним объект { id: number, site: StudySite } для отображения,
// но передаем только id в onChange
export type SelectorValue = string | UserRole | { id: number; site?: StudySite };

interface PseudoSelectorProps {
  // Тип селектора
  type: SelectorType;
  
  // Для типа 'country' - список стран
  // Для типа 'site' - массив центров
  availableOptions?: SelectorValue[];
  
  // Выбранные значения
  selectedValues: SelectorValue[];
  
  // Обработчик изменения
  onChange: (values: SelectorValue[]) => void;
  
  // Дополнительные пропсы
  placeholder?: string;
  searchPlaceholder?: string;
  allowMultiple?: boolean;
  showSiteDetails?: boolean;
  disabled?: boolean;
}

const PseudoSelector: FC<PseudoSelectorProps> = ({ 
  type,
  availableOptions,
  selectedValues, 
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  allowMultiple = true,
  showSiteDetails = true,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Получаем список опций в зависимости от типа
  const getOptions = (): SelectorValue[] => {
    if (type === 'country') {
      return availableOptions && availableOptions.length > 0 
        ? availableOptions 
        : COUNTRIES;
    } else if (type === 'role') {
      return Object.values(UserRole);
    } else if (type === 'site' || type === 'study') {
      return availableOptions || [];
    }
    return [];
  };

  // Получаем отображаемое имя для опции
const getDisplayName = (value: SelectorValue): string => {

  if (type === 'role') {
    const role = value as UserRole;
    return ROLE_CONFIG[role]?.label || role.replace('_', ' ');

  } else if (type === 'site') {
    const siteObj = value as { id: number; site?: StudySite };
    // Всегда пытаемся получить название сайта, если оно доступно
    if (siteObj.site) {
      return `${siteObj.site.name}`;
    }
    // Если сайт не найден в availableOptions, пробуем найти его в переданных опциях
    // Это может случиться, если сайт был удален или недоступен
    return `Site #${siteObj.id} (unavailable)`;
    
  } else if (type === 'study') {
    const studyObj = value as { id: number; study?: Study };
    if (studyObj.study) {
      return studyObj.study.protocol || studyObj.study.title || `Study #${studyObj.id}`;
    }
    return `Study #${studyObj.id}`;
  }
  return value as string;
};

  // Получаем дополнительную информацию для отображения
  const getDisplayInfo = (value: SelectorValue): string | undefined => {

    if (type === 'site') {
      const siteObj = value as { id: number; site?: StudySite };
      if (siteObj.site) {
        //return `${siteObj.site.city}, ${siteObj.site.country}`;
        return `${siteObj.site.study_protocol}`;
      }

    } else if (type === 'study') {
      const studyObj = value as { id: number; study?: Study };
      if (studyObj.study) {
        const details = [];
        //if (studyObj.study.protocol) details.push(`${studyObj.study.protocol}`);
        //return details.join(' • ');
      }
    }
    return undefined;
  };

  // Получаем номер сайта для отображения
  const getSiteNumber = (value: SelectorValue): number | undefined => {
    if (type === 'site') {
      const siteObj = value as { id: number; site?: StudySite };
      if (siteObj.site) {
        return siteObj.site.number;
      }
    }
    return undefined;
  };

  // Получаем цвет для опции
  const getColor = (value: SelectorValue): string | undefined => {
    if (type === 'role') {
      const role = value as UserRole;
      return ROLE_CONFIG[role]?.color;
    } else if (type === 'site') {
      const siteObj = value as { id: number; site?: StudySite };
      if (siteObj.site) {
        return SITE_STATUS_CONFIG[siteObj.site.status]?.color;
      }
    }
    return undefined;
  };

  // Получаем иконку для опции
  const getIcon = (value: SelectorValue): string | undefined => {
    if (type === 'site') {
      const siteObj = value as { id: number; site?: StudySite };
      if (siteObj.site) {
        return SITE_STATUS_CONFIG[siteObj.site.status]?.icon;
      }
    }
    return undefined;
  };

  // Проверяем, выбран ли элемент
  const isSelected = (value: SelectorValue): boolean => {
    if (type === 'site' || type === 'study') {
      const siteObj = value as { id: number; site?: StudySite };
      return selectedValues.some(v => {
        const selectedObj = v as { id: number; site?: StudySite };
        return selectedObj.id === siteObj.id;
      });
    }
    return selectedValues.includes(value);
  };

// Тоггл опции
const toggleOption = (option: SelectorValue) => {
  if (!allowMultiple) {
    onChange([option]);
    setIsOpen(false);
    return;
  }

  let newValues: SelectorValue[];
  
  if (type === 'site' || type === 'study') { // Добавлено 'study'
    const objOption = option as { id: number };
    const isAlreadySelected = selectedValues.some(v => {
      const selectedObj = v as { id: number };
      return selectedObj.id === objOption.id;
    });
    
    if (isAlreadySelected) {
      newValues = selectedValues.filter(v => {
        const selectedObj = v as { id: number };
        return selectedObj.id !== objOption.id;
      });
    } else {
      newValues = [...selectedValues, option];
    }
  } else {
    if (selectedValues.includes(option)) {
      newValues = selectedValues.filter(v => v !== option);
    } else {
      newValues = [...selectedValues, option];
    }
  }
  
  onChange(newValues);
};

// Удаление выбранного тега
const removeTag = (value: SelectorValue, e: React.MouseEvent) => {
  e.stopPropagation();
  
  let newValues: SelectorValue[];
  
  if (type === 'site' || type === 'study') { // Добавлено 'study'
    const objValue = value as { id: number };
    newValues = selectedValues.filter(v => {
      const selectedObj = v as { id: number };
      return selectedObj.id !== objValue.id;
    });
  } else {
    newValues = selectedValues.filter(v => v !== value);
  }
  
  onChange(newValues);
};

  // Выбрать все опции
  const selectAll = () => {
    if (allowMultiple) {
      onChange(getOptions());
    }
  };

  // Очистить все опции
  const clearAll = () => {
    onChange([]);
  };

// Фильтрация опций по поиску
const filteredOptions = getOptions().filter(option => {
  const searchTerm = search.toLowerCase();
  
  if (type === 'site') {
    const siteObj = option as { id: number; site?: StudySite };
    if (siteObj.site) {
      return (
        siteObj.site.name.toLowerCase().includes(searchTerm) ||
        siteObj.site.city.toLowerCase().includes(searchTerm) ||
        siteObj.site.country.toLowerCase().includes(searchTerm) ||
        siteObj.site.principal_investigator.toLowerCase().includes(searchTerm) ||
        siteObj.site.number.toString().includes(searchTerm) ||
        siteObj.id.toString().includes(searchTerm)
      );
    }
    return siteObj.id.toString().includes(searchTerm);
  } else if (type === 'study') { // Добавлено
    const studyObj = option as { id: number; study?: Study; displayName?: string };
    if (studyObj.study) {
      return (
        (studyObj.study.protocol?.toLowerCase().includes(searchTerm) || false) ||
        (studyObj.study.title?.toLowerCase().includes(searchTerm) || false) ||
        (studyObj.study.sponsor?.toLowerCase().includes(searchTerm) || false) ||
        (studyObj.study.cro?.toLowerCase().includes(searchTerm) || false) ||
        studyObj.id.toString().includes(searchTerm)
      );
    }
    return studyObj.id.toString().includes(searchTerm);
  }
  
  return getDisplayName(option).toLowerCase().includes(searchTerm);
});

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger disabled={disabled}>
        <Flex
          align="center"
          justify="between"
          gap="2"
          p="2"
          style={{
            minWidth: 200,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            border: '1px solid var(--gray-4)',
            borderRadius: 'var(--radius-2)',
            backgroundColor: 'var(--color-panel-solid)',
            minHeight: 38
          }}
        >
          <Flex gap="2" wrap="wrap" style={{ flex: 1, minWidth: 0 }}>
            {selectedValues.length > 0 ? (
              selectedValues.map(value => {
                const color = getColor(value);
                return (
                  <Badge
                    key={type === 'site' || type === 'study' ? (value as { id: number }).id.toString() : value.toString()}
                    color={color ? undefined : 'gray'}
                    variant={color ? 'solid' : 'soft'}
                    size="2"
                    style={{ backgroundColor: color }}
                  >
                    {getDisplayName(value)}
                    {allowMultiple && (
                      <Box
                        style={{ marginLeft: 4, cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(value, e as unknown as React.MouseEvent);
                        }}
                      >
                        <Cross2Icon />
                      </Box>
                    )}
                  </Badge>
                );
              })
            ) : (
              <Text size="2" color="gray">{placeholder}</Text>
            )}
          </Flex>
          <ChevronDownIcon />
        </Flex>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        style={{
          minWidth: 300,
          maxWidth: 400,
          maxHeight: 400
        }}
        sideOffset={4}
      >
        <DropdownMenu.Item style={{ padding: 0 }}>
          <TextField.Root
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ width: '100%' }}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>
        </DropdownMenu.Item>

        <Separator size="4" />

        <ScrollArea style={{ maxHeight: 300 }}>
          <Flex direction="column" gap="1" p="1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const selected = isSelected(option);
                const icon = getIcon(option);
                const info = getDisplayInfo(option);
                const siteNumber = getSiteNumber(option);
                const color = getColor(option);

                return (
                  <Flex
                    key={type === 'site' || type === 'study'
                      ? (option as { id: number }).id.toString()
                      : option.toString()
                    }
                    align="center"
                    gap="2"
                    p="2"
                    style={{
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-2)',
                      backgroundColor: selected && color ? color : selected ? 'var(--accent-4)' : 'transparent'
                    }}
                    onClick={() => toggleOption(option)}
                    onMouseEnter={(e) => {
                      if (!selected) {
                        e.currentTarget.style.backgroundColor = 'var(--gray-3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 'var(--radius-1)',
                        border: `1px solid ${selected ? 'var(--accent-9)' : 'var(--gray-6)'}`,
                        backgroundColor: selected ? 'var(--accent-9)' : 'transparent',
                        color: 'white'
                      }}
                    >
                      {selected && <CheckIcon width={12} height={12} />}
                    </Flex>

                    {icon && (
                      <Text size="2">{icon}</Text>
                    )}

                    <Flex direction="column" gap="0" style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        size="2"
                        truncate
                        style={{ color: selected && color ? 'white' : 'inherit' }}
                      >
                        {getDisplayName(option)}
                      </Text>
                      {info && showSiteDetails && (
                        <Text
                          size="1"
                          color={selected && color ? 'gray' : 'gray'}
                          truncate
                        >
                          {info}
                        </Text>
                      )}
                    </Flex>

                    {type === 'role' && !selected && color && (
                      <Box
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: color
                        }}
                      />
                    )}

                    {type === 'site' && siteNumber && (
                      <Text size="1" color={selected && color ? 'gray' : 'gray'}>
                        #{siteNumber}
                      </Text>
                    )}
                  </Flex>
                );
              })
            ) : (
              <Flex align="center" justify="center" p="4">
                <Text size="2" color="gray">
                  {availableOptions && availableOptions.length === 0
                    ? 'No options available'
                    : 'No results found'
                  }
                </Text>
              </Flex>
            )}
          </Flex>
        </ScrollArea>

        {allowMultiple && getOptions().length > 0 && (
          <>
            <Separator size="4" />
            <Flex gap="2" p="2">
              <Button
                size="2"
                variant="surface"
                onClick={selectAll}
                style={{ flex: 1 }}
              >
                Select All
              </Button>
              <Button
                size="2"
                variant="soft"
                color="gray"
                onClick={clearAll}
                style={{ flex: 1 }}
              >
                Clear All
              </Button>
            </Flex>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export const CountrySelector: FC<{
  availableOptions?: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allowMultiple?: boolean;
}> = ({ selectedValues, onChange, placeholder, allowMultiple = false, availableOptions }) => {
  return (
    <PseudoSelector 
      type="country"
      selectedValues={selectedValues}
      onChange={(values) => onChange(values as string[])}
      placeholder={placeholder}
      allowMultiple={allowMultiple}
      availableOptions={availableOptions}
    />
  );
};

export const RoleSelector: FC<{
  selectedValues: UserRole[];
  onChange: (values: UserRole[]) => void;
  placeholder?: string;
  disabled: boolean;
  allowMultiple?: boolean;
}> = ({ selectedValues, onChange, placeholder, disabled, allowMultiple = false }) => {
  return (
    <PseudoSelector 
      type="role"
      selectedValues={selectedValues}
      onChange={(values) => onChange(values as UserRole[])}
      placeholder={placeholder}
      disabled={disabled}
      allowMultiple={allowMultiple}
    />
  );
};


export const SiteSelector: FC<{
  availableOptions: StudySite[];
  selectedValues: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  showSiteDetails?: boolean;
  disabled: boolean;
  user?: StudyUser;
}> = ({ availableOptions, selectedValues, onChange, placeholder, showSiteDetails = true, disabled, user }) => {
  
  
  // Фильтруем доступные опции на основе assigned_site_id пользователя
  // Важно: приводим к одному типу (строке или числу) для сравнения
  const filteredOptions = user 
    ? availableOptions.filter(site => {
        // Приводим оба значения к строке для надежного сравнения
        const siteId = String(site.study_id);
        return user.assigned_study_id.some(assignedId => String(assignedId) === siteId);
      })
    : availableOptions;
    
  // Преобразуем отфильтрованные StudySite[] в { id: number, site: StudySite }[] для отображения
  // Важно: приводим id к числу для соответствия ожидаемому типу SelectorValue
  const siteOptions = filteredOptions.map(site => ({
    id: Number(site.id), // Преобразуем строку в число
    site: site
  }));
  
  // Преобразуем числа (ID) в { id: number, site: StudySite } для отображения
  const selectedSiteObjects = selectedValues
    .map(id => {
      // При поиске также приводим к одному типу
      const foundSite = filteredOptions.find(site => String(site.id) === String(id));
      if (!foundSite) {
        logger.warn(`Site with id ${id} not found in filtered options`);
      }
      return {
        id: Number(id), // Преобразуем в число для консистентности
        site: foundSite
      };
    })
    .filter(obj => obj.site); // Убираем те, для которых не нашли сайт
    
  // Обработчик изменения - извлекаем только ID
  const handleChange = (values: SelectorValue[]) => {
    const ids = values
      .filter(v => typeof v === 'object' && 'id' in v)
      .map(v => Number((v as { id: number }).id)); // Преобразуем в число
    onChange(ids);
  };
  
  return (
    <PseudoSelector 
      type="site"
      availableOptions={siteOptions}
      selectedValues={selectedSiteObjects}
      onChange={handleChange}
      placeholder={placeholder}
      showSiteDetails={showSiteDetails}
      disabled={disabled}
    />
  );
};

export const StudySelector: FC<{
  // Принимаем массив Study для отображения информации
  availableOptions: Study[];
  // Принимаем массив чисел (ID) как выбранные значения
  selectedValues: number[];
  // Возвращаем массив чисел (ID)
  onChange: (values: number[]) => void;
  placeholder?: string;
  disabled: boolean;
  user?: StudyUser;
}> = ({ 
  availableOptions, 
  selectedValues, 
  onChange, 
  placeholder = "Выберите исследования", 
  disabled ,
  user
}) => {

 
  // Преобразуем Study[] в { id: number, study: Study }[] для отображения
  const studyOptions = availableOptions.map((study: Study) => ({
    id: study.id,
    study: study,
    // Добавляем отображаемые поля для удобства
    displayName: study.protocol || study.title || `Исследование ${study.id}`,
    protocol: study.protocol,
  }));
  
  // Преобразуем числа (ID) в { id: number, study?: Study } для отображения
  const selectedStudyObjects = selectedValues.map(id => {
    const foundStudy = availableOptions.find(study => study.id === id);
    return {
      id,
      study: foundStudy,
      displayName: foundStudy?.protocol || foundStudy?.title || `Исследование ${id}`
    };
  });
  
  // Обработчик изменения - извлекаем только ID
  const handleChange = (values: SelectorValue[]) => {
    const ids = values
      .filter(v => typeof v === 'object' && 'id' in v)
      .map(v => (v as { id: number }).id);
    onChange(ids);
  };
  
  return (
    <PseudoSelector 
      type="study"
      availableOptions={studyOptions}
      selectedValues={selectedStudyObjects}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};