import { FC, useState, ChangeEvent } from "react";
//import '../styles/SiteManager.css';
import '../styles/PresudoSelector.css';
import { UserRole, StudySite, SiteStatus, Study, StudyUser } from "@/types/types";

// Список доступных стран
const COUNTRIES_LIST = [
  'Russia', 'Australia', 'China', 'India', 'Brazil', 'Mexico', 'South Korea', 'USA'
];

// Конфигурация для ролей (красивые названия и цвета)
const ROLE_CONFIG = {
  [UserRole.ADMIN]: { label: 'Administrator', color: '#e64980' },
  [UserRole.STUDY_MANAGER]: { label: 'Study Manager', color: '#228be6' },
  [UserRole.DATA_MANAGER]: { label: 'Data Manager', color: '#20c997' },
  [UserRole.MONITOR]: { label: 'Monitor', color: '#fd7e14' },
  [UserRole.INVESTIGATOR]: { label: 'Investigator', color: '#be4bdb' },
  [UserRole.COORDINATOR]: { label: 'Coordinator', color: '#15aabf' },
  [UserRole.AUDITOR]: { label: 'Auditor', color: '#fab005' },
  [UserRole.QUALITY_ASSURANCE]: { label: 'Quality Assurance', color: '#40c057' },
  [UserRole.READ_ONLY]: { label: 'Read Only', color: '#868e96' },
};

// Конфигурация для статусов центров
const SITE_STATUS_CONFIG = {
  [SiteStatus.OPENED]: { label: 'Opened', color: '#51cf66', icon: '🟢' },
  [SiteStatus.PLANNED]: { label: 'Planned', color: '#ff922b', icon: '🟡' },
  [SiteStatus.CLOSED]: { label: 'Closed', color: '#ff6b6b', icon: '🔒' },
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
        : COUNTRIES_LIST;
    } else if (type === 'role') {
      return Object.values(UserRole);
    } else if (type === 'site' || type === 'study') {
      return availableOptions || [];
    }
    return [];
  };

  // Получаем отображаемое имя для опции
  // const getDisplayName = (value: SelectorValue): string => {

  //   if (type === 'role') {
  //     const role = value as UserRole;
  //     return ROLE_CONFIG[role]?.label || role.replace('_', ' ');

  //   } else if (type === 'site' ) {
  //     const siteObj = value as { id: number; site?: StudySite };
  //     if (siteObj.site) {
  //       return siteObj.site.name ;//|| `Site #${siteObj.site.number}`
  //     }
  //     return `Site #${siteObj.id}`;

  //   } else if ( type === 'study'){
  //     const siteObj = value as { id: number; study?: Study };
  //     if (siteObj.study) {
  //       return siteObj.study.protocol;
  //     }
  //     //return `Site #${siteObj.id}`;
  //   }
  //   return value as string;
  // };

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
    <div className="pseudo-selector">
      <div 
        className="selector-trigger"
        onClick={() => {
          if (!disabled)
          setIsOpen(!isOpen)
        }}
      >
        {selectedValues.length > 0 ? (
          <div className="selected-values">
            {selectedValues.map(value => (
              <span 
                key={type === 'site' || type === 'study' ? (value as { id: number }).id.toString() : value.toString()} 
                className="value-tag"
                style={getColor(value) ? { 
                  backgroundColor: getColor(value),
                  color: 'white'
                } : undefined}
              >
                {getDisplayName(value)}
                {allowMultiple && (
                  <button 
                    className="remove-tag"
                    onClick={(e) => removeTag(value, e)}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="selector-dropdown">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="selector-search"
            autoFocus
          />
          
          <div className="selector-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const selected = isSelected(option);
                const icon = getIcon(option);
                const info = getDisplayInfo(option);
                const siteNumber = getSiteNumber(option);
                
                return (
                  <div
                    key={type === 'site' || type === 'study'
                      ? (option as { id: number }).id.toString()
                      : option.toString()
                    }
                    className={`selector-item ${selected ? 'selected' : ''}`}
                    onClick={() => toggleOption(option)}
                    style={getColor(option) && selected ? { 
                      backgroundColor: getColor(option),
                      color: 'white'
                    } : {}}
                  >
                    <span className="selector-checkbox">
                      {selected ? '✓' : ''}
                    </span>
                    
                    {icon && (
                      <span className="option-icon">{icon}</span>
                    )}
                    
                    <div className="option-content">
                      <span title={getDisplayName(option)} className="selector-label">
                        {getDisplayName(option)}
                      </span>
                      {info && showSiteDetails && (
                        <span className="option-info">{info}</span>
                      )}
                    </div>
                    
                    {type === 'role' && !selected && (
                      <span 
                        className="role-color-indicator"
                        style={{ backgroundColor: getColor(option) }}
                      />
                    )}
                    
                    {type === 'site' && siteNumber && (
                      <span className="site-number">
                        #{siteNumber}
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="no-results">
                {availableOptions && availableOptions.length === 0 
                  ? 'No options available' 
                  : 'No results found'
                }
              </div>
            )}
          </div>
          
          <div className="selector-actions">
            {allowMultiple && getOptions().length > 0 && (
              <>
                <button 
                  onClick={selectAll}
                  className="action-button select-all"
                >
                  Select All
                </button>
                <button 
                  onClick={clearAll}
                  className="action-button clear-all"
                >
                  Clear All
                </button>
              </>
            )}
            <button 
              onClick={() => setIsOpen(false)}
              className="action-button done"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CountrySelector: FC<{
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}> = ({ selectedValues, onChange, placeholder }) => {
  return (
    <PseudoSelector 
      type="country"
      selectedValues={selectedValues}
      onChange={(values) => onChange(values as string[])}
      placeholder={placeholder}
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

// export const SiteSelector: FC<{
//   // Принимаем массив StudySite для отображения информации
//   availableOptions: StudySite[];
//   // Принимаем массив чисел (ID) как выбранные значения
//   selectedValues: number[];
//   // Возвращаем массив чисел (ID)
//   onChange: (values: number[]) => void;
//   placeholder?: string;
//   showSiteDetails?: boolean;
//   disabled: boolean;
//   user?: StudyUser;
// }> = ({ availableOptions, selectedValues, onChange, placeholder, showSiteDetails = false, disabled, user }) => {
  
//   // Преобразуем StudySite[] в { id: number, site: StudySite }[] для отображения
//   const siteOptions = availableOptions.map(site => ({
//     id: site.id,
//     site: site
//   }));
  
//   // Преобразуем числа (ID) в { id: number, site?: StudySite } для отображения
//   const selectedSiteObjects = selectedValues.map(id => {
//     console.log(id)
//     const foundSite = availableOptions.find(site => {
//       if(!user) {
//         return site.id === id
//       } else {
//         return user.assigned_site_id.includes(site.id)
//       }
      
//     });
    
//     console.log('foundSite: ', foundSite)
//     return {
//       id,
//       site: foundSite
//     };
//   });
  
//   // Обработчик изменения - извлекаем только ID
//   const handleChange = (values: SelectorValue[]) => {
//     const ids = values
//       .filter(v => typeof v === 'object' && 'id' in v)
//       .map(v => (v as { id: number }).id);
//     onChange(ids);
//   };
  
//   return (
//     <PseudoSelector 
//       type="site"
//       availableOptions={siteOptions}
//       selectedValues={selectedSiteObjects}
//       onChange={handleChange}
//       placeholder={placeholder}
//       showSiteDetails={showSiteDetails}
//       disabled={disabled}
//     />
//   );
// };

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
        console.warn(`Site with id ${id} not found in filtered options`);
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