// import { FC, useState, ChangeEvent } from "react";
// import '../styles/SiteManager.css';
// import '../styles/PresudoSelector.css';
// import { UserRole, StudySite, SiteStatus } from "@/types/types";

// // Список доступных стран
// const COUNTRIES_LIST = [
//   'Russia', 'Australia', 'China', 'India', 'Brazil', 'Mexico', 'South Korea', 'USA'
// ];

// // Конфигурация для ролей (красивые названия и цвета)
// const ROLE_CONFIG = {
//   [UserRole.ADMIN]: { label: 'Administrator', color: '#e64980' },
//   [UserRole.STUDY_MANAGER]: { label: 'Study Manager', color: '#228be6' },
//   [UserRole.DATA_MANAGER]: { label: 'Data Manager', color: '#20c997' },
//   [UserRole.MONITOR]: { label: 'Monitor', color: '#fd7e14' },
//   [UserRole.INVESTIGATOR]: { label: 'Investigator', color: '#be4bdb' },
//   [UserRole.COORDINATOR]: { label: 'Coordinator', color: '#15aabf' },
//   [UserRole.AUDITOR]: { label: 'Auditor', color: '#fab005' },
//   [UserRole.QUALITY_ASSURANCE]: { label: 'Quality Assurance', color: '#40c057' },
//   [UserRole.READ_ONLY]: { label: 'Read Only', color: '#868e96' },
// };

// // Конфигурация для статусов центров
// const SITE_STATUS_CONFIG = {
//   [SiteStatus.OPENED]: { label: 'Opened', color: '#51cf66', icon: '🟢' },
//   [SiteStatus.PLANNED]: { label: 'Planned', color: '#ff922b', icon: '🟡' },
//   [SiteStatus.CLOSED]: { label: 'Closed', color: '#ff6b6b', icon: '🔒' },
// };

// // Типы для селектора
// export type SelectorType = 'country' | 'role' | 'site';
// export type SelectorValue = string | UserRole | StudySite;

// interface PseudoSelectorProps {
//   // Тип селектора
//   type: SelectorType;
  
//   // Для типа 'country' - список стран
//   // Для типа 'site' - список центров
//   availableOptions?: SelectorValue[]; // Теперь поддерживает разные типы
  
//   // Выбранные значения
//   selectedValues: SelectorValue[];
  
//   // Обработчик изменения
//   onChange: (values: SelectorValue[]) => void;
  
//   // Дополнительные пропсы
//   placeholder?: string;
//   searchPlaceholder?: string;
//   allowMultiple?: boolean; // true для множественного выбора, false для одиночного
  
//   // Дополнительные настройки для типа 'site'
//   showSiteDetails?: boolean; // Показывать ли детали центров
//   disabled?: boolean;
// }

// const PseudoSelector: FC<PseudoSelectorProps> = ({ 
//   type,
//   availableOptions,
//   selectedValues, 
//   onChange,
//   placeholder = 'Select...',
//   searchPlaceholder = 'Search...',
//   allowMultiple = true,
//   showSiteDetails = true,
//   disabled = false
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [search, setSearch] = useState('');

//   // Получаем список опций в зависимости от типа
//   const getOptions = (): SelectorValue[] => {
//     if (type === 'country') {
//       return availableOptions && availableOptions.length > 0 
//         ? availableOptions 
//         : COUNTRIES_LIST;
//     } else if (type === 'role') {
//       return Object.values(UserRole);
//     } else if (type === 'site') {
//       // Для центров используем переданные availableOptions
//       return availableOptions || [];
//     }
//     return [];
//   };

//   // Получаем отображаемое имя для опции
//   const getDisplayName = (value: SelectorValue): string => {
//     //console.log('getDisplayName: ',value)
//     if (type === 'role') {
//       const role = value as UserRole;
//       return ROLE_CONFIG[role]?.label || role.replace('_', ' ');
//     } else if (type === 'site') {
//       const site = value as StudySite;
//       return site.name || `Site #${site.number}`;
//     }
//     return value as string;
//   };

//   // Получаем дополнительную информацию для отображения
//   const getDisplayInfo = (value: SelectorValue): string | undefined => {
//     if (type === 'site') {
//       const site = value as StudySite;
//       return `${site.city}, ${site.country}`;
//     }
//     return undefined;
//   };

//   // Получаем цвет для опции
//   const getColor = (value: SelectorValue): string | undefined => {
//     if (type === 'role') {
//       const role = value as UserRole;
//       return ROLE_CONFIG[role]?.color;
//     } else if (type === 'site') {
//       const site = value as StudySite;
//       return SITE_STATUS_CONFIG[site.status]?.color;
//     }
//     return undefined;
//   };

//   // Получаем иконку для опции
//   const getIcon = (value: SelectorValue): string | undefined => {
//     if (type === 'site') {
//       const site = value as StudySite;
//       return SITE_STATUS_CONFIG[site.status]?.icon;
//     }
//     return undefined;
//   };

//   // Проверяем, выбран ли элемент
//   const isSelected = (value: SelectorValue): boolean => {
//     if (type === 'site') {
//       // Для центров сравниваем по ID
//       const site = value as StudySite;
//       return selectedValues.some(v => 
//         typeof v === 'object' && 'id' in v && v.id === site.id
//       );
//     }
//     // Для строк и ролей просто сравниваем значения
//     return selectedValues.includes(value);
//   };

//   // Тоггл опции
//   const toggleOption = (option: SelectorValue) => {
//     if (!allowMultiple) {
//       // Для одиночного выбора
//       onChange([option]);
//       setIsOpen(false);
//       return;
//     }

//     let newValues: SelectorValue[];
    
//     if (type === 'site') {
//       // Для центров сравниваем по ID
//       const siteOption = option as StudySite;
//       const isAlreadySelected = selectedValues.some(v => 
//         typeof v === 'object' && 'id' in v && v.id === siteOption.id
//       );
      
//       if (isAlreadySelected) {
//         newValues = selectedValues.filter(v => 
//           !(typeof v === 'object' && 'id' in v && v.id === siteOption.id)
//         );
//       } else {
//         newValues = [...selectedValues, option];
//       }
//     } else {
//       // Для строк и ролей
//       if (selectedValues.includes(option)) {
//         newValues = selectedValues.filter(v => v !== option);
//       } else {
//         newValues = [...selectedValues, option];
//       }
//     }
    
//     onChange(newValues);
//     //console.log('Selected values:', newValues);
//   };

//   // Удаление выбранного тега
//   const removeTag = (value: SelectorValue, e: React.MouseEvent) => {
//     e.stopPropagation();
    
//     let newValues: SelectorValue[];
    
//     if (type === 'site') {
//       // Для центров сравниваем по ID
//       const siteValue = value as StudySite;
//       newValues = selectedValues.filter(v => 
//         !(typeof v === 'object' && 'id' in v && v.id === siteValue.id)
//       );
//     } else {
//       // Для строк и ролей
//       newValues = selectedValues.filter(v => v !== value);
//     }
    
//     onChange(newValues);
//   };

//   // Выбрать все опции
//   const selectAll = () => {
//     if (allowMultiple) {
//       onChange(getOptions());
//     }
//   };

//   // Очистить все опции
//   const clearAll = () => {
//     onChange([]);
//   };

//   // Фильтрация опций по поиску
//   const filteredOptions = getOptions().filter(option => {
//     const searchTerm = search.toLowerCase();
    
//     if (type === 'site') {
//       const site = option as StudySite;
//       return (
//         site.name.toLowerCase().includes(searchTerm) ||
//         site.city.toLowerCase().includes(searchTerm) ||
//         site.country.includes(searchTerm) ||
//         site.principal_investigator.toLowerCase().includes(searchTerm) ||
//         site.number.toString().includes(searchTerm)
//       );
//     }
    
//     return getDisplayName(option).toLowerCase().includes(searchTerm);
//   });

//   return (
//     <div className="pseudo-selector">
//       <div 
//         className="selector-trigger"
//         onClick={() => {
//           if (!disabled)
//           setIsOpen(!isOpen)
//         }}
//       >
//         {selectedValues.length > 0 ? (
//           <div className="selected-values">
//             {selectedValues.map(value => (
//               <span 
//                 key={type === 'site' ? (value as StudySite).id : value.toString()} 
//                 className="value-tag"
//                 style={getColor(value) ? { 
//                   backgroundColor: getColor(value),
//                   color: 'white'
//                 } : undefined}
//               >
//                 {getDisplayName(value)}
//                 {allowMultiple && (
//                   <button 
//                     className="remove-tag"
//                     onClick={(e) => removeTag(value, e)}
//                   >
//                     ×
//                   </button>
//                 )}
//               </span>
//             ))}
//           </div>
//         ) : (
//           <span className="placeholder">{placeholder}</span>
//         )}
//         <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
//       </div>
      
//       {isOpen && (
//         <div className="selector-dropdown">
//           <input
//             type="text"
//             placeholder={searchPlaceholder}
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="selector-search"
//             autoFocus
//           />
          
//           <div className="selector-options">
//             {filteredOptions.length > 0 ? (
//               filteredOptions.map(option => {
//                 const selected = isSelected(option);
//                 const icon = getIcon(option);
//                 const info = getDisplayInfo(option);
                
//                 return (
//                   <div
//                     key={type === 'site' ? (option as StudySite).id : option.toString()}
//                     className={`selector-item ${selected ? 'selected' : ''}`}
//                     onClick={() => toggleOption(option)}
//                     style={getColor(option) && selected ? { 
//                       backgroundColor: getColor(option),
//                       color: 'white'
//                     } : {}}
//                   >
//                     <span className="selector-checkbox">
//                       {selected ? '✓' : ''}
//                     </span>
                    
//                     {icon && (
//                       <span className="option-icon">{icon}</span>
//                     )}
                    
//                     <div className="option-content">
//                       <span className="selector-label">
//                         {getDisplayName(option)}
//                       </span>
//                       {info && showSiteDetails && (
//                         <span className="option-info">{info}</span>
//                       )}
//                     </div>
                    
//                     {type === 'role' && !selected && (
//                       <span 
//                         className="role-color-indicator"
//                         style={{ backgroundColor: getColor(option) }}
//                       />
//                     )}
                    
//                     {type === 'site' && (
//                       <span className="site-number">
//                         #{(option as StudySite).number}
//                       </span>
//                     )}
//                   </div>
//                 );
//               })
//             ) : (
//               <div className="no-results">
//                 {availableOptions && availableOptions.length === 0 
//                   ? 'No options available' 
//                   : 'No results found'
//                 }
//               </div>
//             )}
//           </div>
          
//           <div className="selector-actions">
//             {allowMultiple && getOptions().length > 0 && (
//               <>
//                 <button 
//                   onClick={selectAll}
//                   className="action-button select-all"
//                 >
//                   Select All
//                 </button>
//                 <button 
//                   onClick={clearAll}
//                   className="action-button clear-all"
//                 >
//                   Clear All
//                 </button>
//               </>
//             )}
//             <button 
//               onClick={() => setIsOpen(false)}
//               className="action-button done"
//             >
//               Done
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export const CountrySelector: FC<{
//   selectedValues: string[];
//   onChange: (values: string[]) => void;
//   placeholder?: string;
// }> = ({ selectedValues, onChange, placeholder }) => {
//   return (
//     <PseudoSelector 
//       type="country"
//       selectedValues={selectedValues}
//       onChange={(values) => onChange(values as string[])}
//       placeholder={placeholder}
//     />
//   );
// };

// export const RoleSelector: FC<{
//   selectedValues: UserRole[];
//   onChange: (values: UserRole[]) => void;
//   placeholder?: string;
//   disabled: boolean;
//   allowMultiple?: boolean;
// }> = ({ selectedValues, onChange, placeholder, disabled, allowMultiple = false }) => {
//   return (
//     <PseudoSelector 
//       type="role"
//       selectedValues={selectedValues}
//       onChange={(values) => onChange(values as UserRole[])}
//       placeholder={placeholder}
//       disabled={disabled}
//       allowMultiple={allowMultiple}
//     />
//   );
// };

// export const SiteSelector: FC<{
//   availableOptions: StudySite[];
//   selectedValues: StudySite[];
//   onChange: (values: StudySite[]) => void;
//   placeholder?: string;
//   showSiteDetails?: boolean;
//   disabled: boolean;
// }> = ({ availableOptions, selectedValues, onChange, placeholder, showSiteDetails = false, disabled }) => {
//   return (
//     <PseudoSelector 
//       type="site"
//       availableOptions={availableOptions}
//       selectedValues={selectedValues}
//       onChange={(values) => onChange(values as StudySite[])}
//       placeholder={placeholder}
//       showSiteDetails={showSiteDetails}
//       disabled={disabled}
//     />
//   );
// };

// // Примеры использования компонента:

// // 1. Для выбора стран:
// // <PseudoSelector 
// //   type="country"
// //   selectedValues={selectedCountries}
// //   onChange={setSelectedCountries}
// //   placeholder="Select countries..."
// // />

// // 2. Для выбора ролей:
// // <PseudoSelector 
// //   type="role"
// //   selectedValues={selectedRoles}
// //   onChange={setSelectedRoles}
// //   placeholder="Select user roles..."
// //   allowMultiple={true}
// // />

// // 3. Для выбора центров:
// // <PseudoSelector 
// //   type="site"
// //   availableOptions={sitesList}
// //   selectedValues={selectedSites}
// //   onChange={setSelectedSites}
// //   placeholder="Select study sites..."
// //   showSiteDetails={true}
// //   allowMultiple={true}
// // />

// // 4. Для одиночного выбора центра:
// // <PseudoSelector 
// //   type="site"
// //   availableOptions={sitesList}
// //   selectedValues={selectedSite ? [selectedSite] : []}
// //   onChange={(values) => setSelectedSite(values[0] as StudySite || null)}
// //   allowMultiple={false}
// //   placeholder="Select a site..."
// // />

// //export default PseudoSelector;
import { FC, useState, ChangeEvent } from "react";
import '../styles/SiteManager.css';
import '../styles/PresudoSelector.css';
import { UserRole, StudySite, SiteStatus } from "@/types/types";

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
export type SelectorType = 'country' | 'role' | 'site';

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
    } else if (type === 'site') {
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
      if (siteObj.site) {
        return siteObj.site.name || `Site #${siteObj.site.number}`;
      }
      return `Site #${siteObj.id}`;
    }
    return value as string;
  };

  // Получаем дополнительную информацию для отображения
  const getDisplayInfo = (value: SelectorValue): string | undefined => {
    if (type === 'site') {
      const siteObj = value as { id: number; site?: StudySite };
      if (siteObj.site) {
        return `${siteObj.site.city}, ${siteObj.site.country}`;
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
    if (type === 'site') {
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
    
    if (type === 'site') {
      const siteOption = option as { id: number; site?: StudySite };
      const isAlreadySelected = selectedValues.some(v => {
        const selectedObj = v as { id: number; site?: StudySite };
        return selectedObj.id === siteOption.id;
      });
      
      if (isAlreadySelected) {
        newValues = selectedValues.filter(v => {
          const selectedObj = v as { id: number; site?: StudySite };
          return selectedObj.id !== siteOption.id;
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
    
    if (type === 'site') {
      const siteValue = value as { id: number; site?: StudySite };
      newValues = selectedValues.filter(v => {
        const selectedObj = v as { id: number; site?: StudySite };
        return selectedObj.id !== siteValue.id;
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
                key={type === 'site' ? (value as { id: number }).id.toString() : value.toString()} 
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
                    key={type === 'site' ? (option as { id: number }).id.toString() : option.toString()}
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
                      <span className="selector-label">
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

export const SiteSelector: FC<{
  // Принимаем массив StudySite для отображения информации
  availableOptions: StudySite[];
  // Принимаем массив чисел (ID) как выбранные значения
  selectedValues: number[];
  // Возвращаем массив чисел (ID)
  onChange: (values: number[]) => void;
  placeholder?: string;
  showSiteDetails?: boolean;
  disabled: boolean;
}> = ({ availableOptions, selectedValues, onChange, placeholder, showSiteDetails = false, disabled }) => {
  
  // Преобразуем StudySite[] в { id: number, site: StudySite }[] для отображения
  const siteOptions = availableOptions.map(site => ({
    id: site.id,
    site: site
  }));
  
  // Преобразуем числа (ID) в { id: number, site?: StudySite } для отображения
  const selectedSiteObjects = selectedValues.map(id => {
    const foundSite = availableOptions.find(site => site.id === id);
    return {
      id,
      site: foundSite
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

// Примеры использования компонента:

// 1. Для выбора стран:
// <PseudoSelector 
//   type="country"
//   selectedValues={selectedCountries}
//   onChange={setSelectedCountries}
//   placeholder="Select countries..."
// />

// 2. Для выбора ролей:
// <PseudoSelector 
//   type="role"
//   selectedValues={selectedRoles}
//   onChange={setSelectedRoles}
//   placeholder="Select user roles..."
//   allowMultiple={true}
// />

// 3. Для выбора центров (с отображением деталей):
// const sites = [studySite1, studySite2, studySite3]; // массив StudySite
// const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
// 
// <SiteSelector
//   availableOptions={sites}
//   selectedValues={selectedSiteIds}
//   onChange={setSelectedSiteIds}
//   placeholder="Select study sites..."
//   showSiteDetails={true}
//   disabled={false}
// />

// 4. Пример использования в User форме:
// interface User {
//   id: number;
//   name: string;
//   role: UserRole;
//   sites: number[]; // только ID центров
// }
// 
// const [userSites, setUserSites] = useState<number[]>([]);
// 
// <SiteSelector
//   availableOptions={allStudySites}
//   selectedValues={userSites}
//   onChange={setUserSites}
//   placeholder="Assign sites to user..."
//   disabled={false}
// />

//export default PseudoSelector;
