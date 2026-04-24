// // components/reports/ReportFilters.tsx
// 'use client';

// import { Select, Button, Flex, Text, Checkbox, Callout, Spinner } from '@radix-ui/themes';
// import { useState, useEffect, useMemo, useContext, useCallback, useRef } from 'react';
// import { useReportContext } from '@/wrappers/ReportContext';
// import { FilterType } from '@/types/reports.type';
// import { AdminContext } from '@/wrappers/AdminContext';
// import { InfoCircledIcon } from '@radix-ui/react-icons';
// import { FolderLevel, FolderNode } from '@/types/folder';
// import { FilterState, StudyOption, CountryOption, CenterOption, Site, FolderOption } from './report.filters.type';

// export type Props = {
//   onGenerate: (filters: any) => Promise<void>;
// };

// export function ReportFilters({ onGenerate }: Props) {
//   const { studies } = useContext(AdminContext)!;
//   const { reportContext, updateReportContext } = useReportContext();
//   const { selectedFilter } = reportContext;
  
//   const [filters, setFilters] = useState<FilterState>({
//     studyId: null,
//     country: null,
//     centerId: null,
//     folderIds: [],
//   });
  
//   const [enableFolderFilter, setEnableFolderFilter] = useState(false);
  
//   const filterType = selectedFilter?.type;
//   const isUpdatingRef = useRef(false);

//   const [isGenerating, setIsGenerating] = useState(false);

//   // Сброс всех фильтров при изменении типа отчета
//   useEffect(() => {
//     // Сбрасываем все значения фильтров
//     setFilters({
//       studyId: null,
//       country: null,
//       centerId: null,
//       folderIds: [],
//     });
//     // Сбрасываем чекбокс фильтра по папкам
//     setEnableFolderFilter(false);
//   }, [filterType]);

//   // Получаем список исследований для выбора
//   const studyOptions: StudyOption[] = useMemo(() => {
//     if (!studies || !Array.isArray(studies)) return [];
    
//     return studies.map((study: any) => ({
//       id: String(study.id),
//       label: study.title || study.name || '',
//       protocol: study.protocol || '',
//       countries: study.countries || [],
//       sites: study.sites || [],
//       foldersStructure: study.folders_structure || study.foldersStructure,
//     }));
//   }, [studies, selectedFilter]);

//   // Получаем выбранное исследование
//   const selectedStudy: StudyOption | null = useMemo(() => {
//     if (!filters.studyId) return null;
//     return studyOptions.find(s => s.id === filters.studyId) || null;
//   }, [filters.studyId, studyOptions]);

//   // Опции стран для выбранного исследования
//   const countryOptions: CountryOption[] = useMemo(() => {
//     if (!selectedStudy) return [];
//     return selectedStudy.countries.map((country: string) => ({
//       id: country,
//       label: country,
//     }));
//   }, [selectedStudy]);

//   // Опции центров для выбранного исследования и страны
//   const centerOptions: CenterOption[] = useMemo(() => {
//     if (!selectedStudy || !filters.country) return [];
//     const sites = selectedStudy.sites || [];
//     return sites
//       .filter((site: Site) => site.country === filters.country)
//       .map((site: Site) => ({
//         id: String(site.id),
//         number: site.number,
//         label: site.name,
//         country: site.country,
//         city: site.city,
//       }));
//   }, [selectedStudy, filters.country]);

//   // Функция для получения папок с фильтрацией по типу и уровню
//   const getAllFolders = useCallback((node: FolderNode, path: string[] = []): FolderOption[] => {
//     let folders: FolderOption[] = [];
    
//     if (node.children && node.children.length > 0) {
//       for (const child of node.children) {
//         const currentPath = [...path, child.name];
        
//         // Проверяем, что папка имеет тип 'subfolder'
//         if (child.type === 'subfolder') {
//           // Определяем, какие уровни папок показывать в зависимости от типа фильтра
//           let shouldIncludeByLevel = false;
          
//           switch (filterType) {
//             case 'study':
//               // Для отчета по исследованию показываем только папки с уровнем GENERAL
//               shouldIncludeByLevel = child.level === FolderLevel.GENERAL;
//               break;
//             case 'country':
//               // Для отчета по стране показываем папки с уровнем GENERAL и COUNTRY
//               shouldIncludeByLevel = child.level === FolderLevel.COUNTRY;
//               break;
//             case 'center':
//               // Для отчета по центру показываем папки с уровнем GENERAL, COUNTRY и SITE
//               shouldIncludeByLevel = child.level === FolderLevel.SITE;
//               break;
//             default:
//               shouldIncludeByLevel = true;
//           }
          
//           // Добавляем папку только если она соответствует критериям
//           if (shouldIncludeByLevel) {
//             folders.push({
//               id: child.id,
//               label: currentPath.join(' / '),
//               path: currentPath.join('/'),
//             });
//           }
//         }
        
//         // Рекурсивно обрабатываем дочерние элементы
//         folders = [...folders, ...getAllFolders(child, currentPath)];
//       }
//     }
    
//     return folders;
//   }, [filterType]);

//   // Опции папок для выбранного исследования
//   const folderOptions: FolderOption[] = useMemo(() => {
//     if (!selectedStudy || !selectedStudy.foldersStructure) return [];
//     return getAllFolders(selectedStudy.foldersStructure);
//   }, [selectedStudy, getAllFolders]);

//   // Сброс чекбокса и выбранных папок при изменении основного фильтра
//   useEffect(() => {
//     setEnableFolderFilter(false);
//     setFilters(prev => ({ ...prev, folderIds: [] }));
//   }, [filters.studyId, filters.country, filters.centerId]);

//   // Обновление контекста при изменении фильтров
//   useEffect(() => {
//     if (isUpdatingRef.current) return;
    
//     if (!selectedFilter) return;

//     let value = '';
//     let label = '';

//     // Формируем значение с учетом выбранных папок
//     const folderSuffix = enableFolderFilter && filters.folderIds.length > 0 
//       ? `_folders:${filters.folderIds.join(',')}` 
//       : '';

//     switch (filterType) {
//       case 'study':
//         if (filters.studyId) {
//           const study = studyOptions.find(s => s.id === filters.studyId);
//           value = filters.studyId + folderSuffix;
//           label = study?.label || '';
//           if (enableFolderFilter && filters.folderIds.length > 0) {
//             label += ` (папки: ${filters.folderIds.length})`;
//           } else if (!enableFolderFilter) {
//             label += ' (все папки)';
//           }
//         }
//         break;
//       case 'country':
//         if (filters.studyId && filters.country) {
//           value = `${filters.studyId}_${filters.country}${folderSuffix}`;
//           label = `${selectedStudy?.label} - ${filters.country}`;
//           if (enableFolderFilter && filters.folderIds.length > 0) {
//             label += ` (папки: ${filters.folderIds.length})`;
//           } else if (!enableFolderFilter) {
//             label += ' (все папки)';
//           }
//         }
//         break;
//       case 'center':
//         if (filters.studyId && filters.country && filters.centerId) {
//           value = `${filters.studyId}_${filters.country}_${filters.centerId}${folderSuffix}`;
//           const center = centerOptions.find(c => c.id === filters.centerId);
//           label = `${selectedStudy?.label} - ${filters.country} - ${center?.label}`;
//           if (enableFolderFilter && filters.folderIds.length > 0) {
//             label += ` (папки: ${filters.folderIds.length})`;
//           } else if (!enableFolderFilter) {
//             label += ' (все папки)';
//           }
//         }
//         break;
//       case 'folder':
//         if (filters.studyId && filters.folderIds.length > 0) {
//           value = `${filters.studyId}_folders:${filters.folderIds.join(',')}`;
//           const firstFolder = folderOptions.find(f => f.id === filters.folderIds[0]);
//           label = `${selectedStudy?.label} - ${firstFolder?.label || 'выбранные папки'}`;
//           if (filters.folderIds.length > 1) {
//             label += ` и ещё ${filters.folderIds.length - 1}`;
//           }
//         }
//         break;
//     }

//     if (selectedFilter.value !== value || selectedFilter.label !== label) {
//       isUpdatingRef.current = true;
//       updateReportContext({
//         selectedFilter: {
//           ...selectedFilter,
//           value,
//           label,
//         },
//       });
//       setTimeout(() => {
//         isUpdatingRef.current = false;
//       }, 0);
//     }
//   }, [filters, filterType, selectedStudy, studyOptions, centerOptions, folderOptions, selectedFilter, updateReportContext, enableFolderFilter]);

//   const handleStudyChange = (value: string) => {
//     setFilters(prev => ({
//       studyId: value,
//       country: null,
//       centerId: null,
//       folderIds: [],
//     }));
//   };

//   const handleCountryChange = (value: string) => {
//     setFilters(prev => ({
//       ...prev,
//       country: value,
//       centerId: null,
//       folderIds: [],
//     }));
//   };

//   const handleCenterChange = (value: string) => {
//     setFilters(prev => ({
//       ...prev,
//       centerId: value,
//       folderIds: [],
//     }));
//   };

//   const handleFolderToggle = (folderId: string) => {
//     setFilters(prev => ({
//       ...prev,
//       folderIds: prev.folderIds.includes(folderId)
//         ? prev.folderIds.filter(id => id !== folderId)
//         : [...prev.folderIds, folderId],
//     }));
//   };

//   const handleGenerate = async () => {
//     if (!selectedFilter?.value) return;
    
//     setIsGenerating(true);
//     try {
//       await onGenerate(selectedFilter);
//     } finally {
//       setIsGenerating(false);
//     }
//   };

//   const isGenerateDisabled = (): boolean => {
//     if (!filterType) return true;

//     const foldersNotSelected = enableFolderFilter && filters.folderIds.length === 0;
    
//     switch (filterType) {
//       case 'study':
//         return !filters.studyId || foldersNotSelected;
//       case 'country':
//         return !filters.studyId || !filters.country || foldersNotSelected;
//       case 'center':
//         return !filters.studyId || !filters.country || !filters.centerId || foldersNotSelected;
//       // case 'folder':
//       //   return !filters.studyId || filters.folderIds.length === 0;
//       default:
//         return true;
//     }
//   };

//   // Показывать ли информацию о директориях
//   const showFolderInfo = (): boolean => {
//     if (!filterType) return false;
//     if (filterType === 'folder') return false;
    
//     switch (filterType) {
//       case 'study':
//         return !!filters.studyId;
//       case 'country':
//         return !!filters.studyId && !!filters.country;
//       case 'center':
//         return !!filters.studyId && !!filters.country && !!filters.centerId;
//       default:
//         return false;
//     }
//   };

//   if (!filterType) return null;

//   return (
//     <Flex 
//       direction="column" 
//       gap="2" 
//       style={{ 
//         width: '100%', 
//         height: '100%',
//         minHeight: 0,
//         overflow: 'hidden',
//         flex: 1
//       }}
//     >
//       <Text size="3" weight="bold">
//         Настройка фильтров для {getFilterLabel(filterType)}
//       </Text>

//       <Flex direction="row" gap="4">
//       {/* Выбор исследования - всегда первый */}
//       <Flex direction="column" gap="2">
//         <Text size="2" weight="bold">Исследование:</Text>
//         <Select.Root 
//           key={`study-select-${filterType}`}
//           value={filters.studyId || undefined} 
//           onValueChange={handleStudyChange}
//           size="2"
//         >
//           <Select.Trigger 
//             placeholder="Выберите исследование..." 
//             style={{ minWidth: 300 }}
//           />
//           <Select.Content>
//             <Select.Group>
//               {studyOptions.map((option: StudyOption) => (
//                 <Select.Item key={option.id} value={option.id}>
//                   <Flex direction="column">
//                     <Text size="2">{option.protocol}</Text>
//                   </Flex>
//                 </Select.Item>
//               ))}
//             </Select.Group>
//           </Select.Content>
//         </Select.Root>
//       </Flex>

//       {/* Выбор страны (для country, center) */}
//       {(filterType === 'country' || filterType === 'center') && filters.studyId && (
//         <Flex direction="column" gap="2">
//           <Text size="2" weight="bold">Страна:</Text>
//           <Select.Root 
//             key={`country-select-${filterType}-${filters.studyId}`}
//             value={filters.country || undefined} 
//             onValueChange={handleCountryChange}
//             size="2"
//           >
//             <Select.Trigger 
//               placeholder="Выберите страну..." 
//               style={{ minWidth: 300 }}
//             />
//             <Select.Content>
//               <Select.Group>
//                 {countryOptions.map((option: CountryOption) => (
//                   <Select.Item key={option.id} value={option.id}>
//                     {option.label}
//                   </Select.Item>
//                 ))}
//               </Select.Group>
//             </Select.Content>
//           </Select.Root>
//         </Flex>
//       )}

//       {/* Выбор центра (только для center) */}
//       {filterType === 'center' && filters.studyId && filters.country && (
//         <Flex direction="column" gap="2">
//           <Text size="2" weight="bold">Центр:</Text>
//           <Select.Root 
//             key={`center-select-${filterType}-${filters.studyId}-${filters.country}`}          
//             value={filters.centerId || undefined} 
//             onValueChange={handleCenterChange}
//             size="2"
//           >
//             <Select.Trigger 
//               placeholder="Выберите центр..." 
//               style={{ minWidth: 300 }}
//             />
//             <Select.Content>
//               <Select.Group>
//                 {centerOptions.map((option: CenterOption) => (
//                   <Select.Item key={option.id} value={option.id}>
//                     <Flex direction="column">
//                       <Text size="2">{option.label}</Text>
//                     </Flex>
//                   </Select.Item>
//                 ))}
//               </Select.Group>
//             </Select.Content>
//           </Select.Root>
//         </Flex>
//       )}
//       </Flex>

//       {/* Информация о директориях и чекбокс */}
//       {showFolderInfo() && filterType !== 'folder' && (
//         <Flex direction="column" gap="3" style={{ 
//           marginTop: 8, 
//           padding: 12, 
//           backgroundColor: 'var(--gray-3)', 
//           borderRadius: 8 
//         }}>
//           <Callout.Root>
//             <Callout.Icon>
//               <InfoCircledIcon />
//             </Callout.Icon>
//             <Callout.Text>
//               Отчет будет сформирован по всем директориям. Используйте чек-бокс ниже для создания отчета только по необходимым директориям.
//             </Callout.Text>
//           </Callout.Root>
          
//           <Text as="label" size="2">
//             <Flex gap="2">
//               <Checkbox 
//                 style={{cursor: 'pointer'}}
//                 checked={enableFolderFilter}
//                 onCheckedChange={(checked) => setEnableFolderFilter(checked === true)}
//               />
//               Добавить фильтр по папкам
//             </Flex>
//           </Text>
//         </Flex>
//       )}

//       {/* Выбор папок (появляется при включенном чекбоксе) */}
//       {enableFolderFilter && filterType !== 'folder' && filters.studyId && folderOptions.length > 0 && (
//         <Flex direction="column" gap="2">
//           <Text size="2" weight="bold">Выберите папки (можно несколько):</Text>
//           <Flex direction="column" gap="2" style={{ 
//             maxHeight: 180, 
//             overflowY: 'auto', 
//             padding: 8,
//             border: '1px solid var(--gray-6)',
//             borderRadius: 6
//           }}>
//             {folderOptions.map((option: FolderOption) => (
//               <Flex key={option.id} gap="2" align="center">
//                 <Checkbox
//                   style={{cursor: 'pointer'}}
//                   checked={filters.folderIds.includes(option.id)}
//                   onCheckedChange={() => handleFolderToggle(option.id)}
//                 />
//                 <Text size="2">{option.label}</Text>
//               </Flex>
//             ))}
//           </Flex>
//             <Text size="1" color="gray">
//               Выбрано папок: {filters.folderIds.length}
//             </Text>
//         </Flex>
//       )}

//       <Button 
//         onClick={handleGenerate} 
//         disabled={isGenerateDisabled() || isGenerating}
//         style={{ alignSelf: 'flex-end' }}
//         size="2"
//       >
//         {isGenerating ? 'Создание отчета...' : 'Сформировать отчет'}
//         {isGenerating && <Spinner />}
//       </Button>
//     </Flex>
//   );
// }

// function getFilterLabel(type: FilterType): string {
//   switch (type) {
//     case 'study': return 'исследованию';
//     case 'country': return 'стране';
//     case 'center': return 'центру';
//     case 'folder': return 'папке';
//   }
// }

'use client';

import {
  Select,
  Button,
  Flex,
  Text,
  Checkbox,
  Callout,
  Spinner,
} from '@radix-ui/themes';

import { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { useReportContext } from '@/wrappers/ReportContext';
import { AdminContext } from '@/wrappers/AdminContext';
import { InfoCircledIcon } from '@radix-ui/react-icons';

import {
  AuditReportRequest,
  FilterType,
} from '@/types/reports.type';

import {
  FilterState,
  StudyOption,
  CountryOption,
  CenterOption,
  Site,
  FolderOption,
} from './report.filters.type';
import { FolderLevel } from '@/types/folder';
import { useAuth } from '@/wrappers/AuthProvider';
import React from 'react';

type Props = {
  onGenerate: (payload: AuditReportRequest) => Promise<void>;
};

export function ReportFilters({ onGenerate }: Props) {
  const { studies } = useContext(AdminContext)!;
  const { reportContext } = useReportContext();
  const { user } = useAuth()!;

  const filterType = reportContext.selectedFilter?.type;

  const [filters, setFilters] = useState<FilterState>({
    studyId: null,
    country: null,
    centerId: null,
    folderIds: [],
  });

  const [enableFolderFilter, setEnableFolderFilter] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // reset on report type change
  useEffect(() => {
    setFilters({
      studyId: null,
      country: null,
      centerId: null,
      folderIds: [],
    });
    setEnableFolderFilter(false);
  }, [filterType]);

  // -------------------------
  // STUDIES
  // -------------------------
  const studyOptions: StudyOption[] = useMemo(() => {
    if (!studies) return [];

    return studies
    .filter(study => user?.assigned_study_id?.includes(study.id))
    .map((s: any) => ({
      id: String(s.id),
      label: s.title || s.name || '',
      protocol: s.protocol || '',
      countries: s.countries || [],
      sites: s.sites || [],
      foldersStructure: s.folders_structure || s.foldersStructure,
    }));
  }, [studies]);

  const selectedStudy = useMemo(
    () => studyOptions.find(s => s.id === filters.studyId) || null,
    [filters.studyId, studyOptions]
  );

  // -------------------------
  // COUNTRIES
  // -------------------------
  const countryOptions: CountryOption[] = useMemo(() => {
    if (!selectedStudy) return [];
    return selectedStudy.countries.map((c: string) => ({
      id: c,
      label: c,
    }));
  }, [selectedStudy]);

  // -------------------------
  // CENTERS (sites)
  // -------------------------
  const centerOptions: CenterOption[] = useMemo(() => {
    if (!selectedStudy || !filters.country) return [];

    return (selectedStudy.sites || [])
      .filter((s: Site) => s.country === filters.country)
      .map((s: Site) => ({
        id: String(s.id),
        label: s.name,
        number: s.number,
        country: s.country,
        city: s.city,
      }));
  }, [selectedStudy, filters.country]);

  // -------------------------
  // FOLDERS
  // -------------------------
  const getFolders = useCallback((node: any, path: string[] = []): FolderOption[] => {
    let result: FolderOption[] = [];

    if (!node?.children) return [];

    for (const child of node.children) {
      const currentPath = [...path, child.name];

      if (child.type === 'subfolder') {
        // Определяем, какие уровни папок показывать в зависимости от типа фильтра
        let shouldIncludeByLevel = false;
        
        switch (filterType) {
          case 'study':
            // Для отчета по исследованию показываем только папки с уровнем GENERAL
            shouldIncludeByLevel = child.level === FolderLevel.GENERAL;
            break;
          case 'country':
            // Для отчета по стране показываем папки с уровнем GENERAL и COUNTRY
            shouldIncludeByLevel = child.level === FolderLevel.COUNTRY;
            break;
          case 'center':
            // Для отчета по центру показываем папки с уровнем GENERAL, COUNTRY и SITE
            shouldIncludeByLevel = child.level === FolderLevel.SITE;
            break;
          default:
            shouldIncludeByLevel = true;
        }

        if (shouldIncludeByLevel) {
          result.push({
            id: child.id,
            label: currentPath.join(' / '),
            path: currentPath.join('/'),
          });
        }
      }

      result = [...result, ...getFolders(child, currentPath)];
    }

    return result;
  }, []);

  const folderOptions: FolderOption[] = useMemo(() => {
    if (!selectedStudy?.foldersStructure) return [];
    return getFolders(selectedStudy.foldersStructure);
  }, [selectedStudy, getFolders]);

  // -------------------------
  // HANDLERS
  // -------------------------
  const handleStudyChange = (value: string) => {
    setFilters({
      studyId: value,
      country: null,
      centerId: null,
      folderIds: [],
    });
    setEnableFolderFilter(false);
  };

  const handleCountryChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      country: value,
      centerId: null,
      folderIds: [],
    }));
    setEnableFolderFilter(false);
  };

  const handleCenterChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      centerId: value,
      folderIds: [],
    }));
    setEnableFolderFilter(false);
  };

  const handleFolderToggle = (id: string) => {
    setFilters(prev => ({
      ...prev,
      folderIds: prev.folderIds.includes(id)
        ? prev.folderIds.filter(f => f !== id)
        : [...prev.folderIds, id],
    }));
  };

  // -------------------------
  // BUILD API PAYLOAD
  // -------------------------
  const buildPayload = (): AuditReportRequest => {
    return {
      context: {
        studyId: filters.studyId || undefined,
        siteId: filters.centerId || undefined,
      },
      filters: {
        country: filters.country || undefined,
      },
      pagination: {
        limit: 50,
        offset: 0,
      },
    };
  };

  // -------------------------
  // GENERATE
  // -------------------------
  const handleGenerate = async () => {
    const payload = buildPayload();

    setIsGenerating(true);
    try {
      await onGenerate(payload);
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------
  // VALIDATION
  // -------------------------
  const isDisabled =
    !filters.studyId ||
    (filterType === 'country' && !filters.country) ||
    (filterType === 'center' && !filters.centerId) ||
    (enableFolderFilter && filters.folderIds.length === 0);


  // Показывать ли информацию о директориях
  const showFolderInfo = (): boolean => {
    if (!filterType) return false;
    if (filterType === 'folder') return false;
    
    switch (filterType) {
      case 'study':
        return !!filters.studyId;
      case 'country':
        return !!filters.studyId && !!filters.country;
      case 'center':
        return !!filters.studyId && !!filters.country && !!filters.centerId;
      default:
        return false;
    }
  };

  if (!filterType) return null;

  return (
    <Flex direction="column" gap="3"
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        flex: 1
      }}
    
    >
      <Text size="3" weight="bold">
        Настройка фильтров по {getFilterLabel(filterType)}
      </Text>

      <Flex direction="row" gap="3">
      {/* STUDY */}
      <Select.Root 
        value={filters.studyId || undefined} 
        onValueChange={handleStudyChange} 
        key={`study-select-${filterType}`}
      >
        <Select.Trigger placeholder="Study" style={{ minWidth: 300 }} />
        <Select.Content >
          {studyOptions.map(s => (
            <Select.Item key={s.id} value={s.id}>
              {s.protocol}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>

      {/* COUNTRY */}
      {(filterType === 'country' || filterType === 'center') && (
        <Select.Root 
          value={filters.country || undefined} 
          onValueChange={handleCountryChange}
          key={`country-select-${filterType}-${filters.studyId}`}
        >
          <Select.Trigger placeholder="Country" style={{ minWidth: 300 }} />
          <Select.Content >
            {countryOptions.map(c => (
              <Select.Item key={c.id} value={c.id}>
                {c.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )}

      {/* CENTER */}
      {filterType === 'center' && (
        <Select.Root 
          value={filters.centerId || undefined} 
          onValueChange={handleCenterChange}
          key={`center-select-${filterType}-${filters.studyId}-${filters.country}`}
        >
          <Select.Trigger placeholder="Site" style={{ minWidth: 300 }} />
          <Select.Content >
            {centerOptions.map(c => (
              <Select.Item key={c.id} value={c.id}>
                {c.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )}
      </Flex>

      {/* FOLDERS */}
      {showFolderInfo() && filterType !== 'folder' && (
        <Flex direction="column" gap="3" style={{ 
          marginTop: 8, 
          padding: 12, 
          backgroundColor: 'var(--gray-3)', 
          borderRadius: 8 
        }}>
          <Callout.Root>
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Отчет будет сформирован по всем директориям. Используйте чек-бокс ниже для создания отчета только по необходимым директориям.
            </Callout.Text>
          </Callout.Root>
          
          <Text as="label" size="2">
            <Flex gap="2">
              <Checkbox 
                style={{cursor: 'pointer'}}
                checked={enableFolderFilter}
                onCheckedChange={(checked) => setEnableFolderFilter(checked === true)}
              />
              Добавить фильтр по папкам
            </Flex>
          </Text>
        </Flex>
      )}

      {/* Выбор папок (появляется при включенном чекбоксе) */}
      {enableFolderFilter && filterType !== 'folder' && filters.studyId && folderOptions.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold">Выберите папки (можно несколько):</Text>
          <Flex direction="column" gap="2" style={{ 
            maxHeight: 180, 
            overflowY: 'auto', 
            padding: 8,
            border: '1px solid var(--gray-6)',
            borderRadius: 6
          }}>
            {folderOptions.map((option: FolderOption) => (
              <Flex key={option.id} gap="2" align="center">
                <Checkbox
                  style={{cursor: 'pointer'}}
                  checked={filters.folderIds.includes(option.id)}
                  onCheckedChange={() => handleFolderToggle(option.id)}
                />
                <Text size="2">{option.label}</Text>
              </Flex>
            ))}
          </Flex>
            <Text size="1" color="gray">
              Выбрано папок: {filters.folderIds.length}
            </Text>
        </Flex>
      )}


      {/* SUBMIT */}
      <Flex style={{ alignSelf: 'flex-end' }}>
        <Button disabled={isDisabled || isGenerating} onClick={handleGenerate} >
          {isGenerating ? <Spinner /> : 'Generate report'}
        </Button>
      </Flex>
    </Flex>
  );
}

function getFilterLabel(type: FilterType): string {
  switch (type) {
    case 'study': return 'исследованию';
    case 'country': return 'стране';
    case 'center': return 'центру';
    case 'folder': return 'папке';
  }
}
