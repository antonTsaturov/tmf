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
