// src/components/Navigation.tsx
'use client'

import { useContext, useEffect, useCallback, useMemo } from 'react';
import { AdminContext } from '@/wrappers/AdminContext';
import { Select, Flex, Text, Spinner, Button, Tooltip } from '@radix-ui/themes';
import { useAuth } from '@/wrappers/AuthProvider';
import { Study, StudySite } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';
import { IoIosArrowForward } from "react-icons/io";
import React from 'react';
import { ViewLevel } from '@/types/types';
import { useI18n } from '@/hooks/useI18n';
import { useStudyChange } from '@/hooks/useStudyChange'; 
import { LuLayers3 } from "react-icons/lu";
import { SITE_STATUS_CONFIG, SiteStatus } from '@/types/site';


interface StudySiteNavigationProps {
  onStudyChange?: (study: Study | undefined) => void;
  onSiteChange?: (site: StudySite | undefined) => void;
  onViewLevelChange?: (level: ViewLevel | undefined) => void;
}

const Navigation: React.FC<StudySiteNavigationProps> = ({
  onStudyChange,
  onSiteChange,
  onViewLevelChange,
}) => {
  const { t } = useI18n('navigation');
  const { user, loading: authLoading } = useAuth();
  /*
  * studies - стартовая точка загрузки. Объект studies содержит вложенный объект
  * центров, которые назначены пользователю.
  */
  const { studies, loading } = useContext(AdminContext)!;
  const { context, updateContext } = useContext(MainContext)!;
  const { currentSite, currentStudy, currentLevel, currentCountry, countryFilter } = context;


  // Сброс выбранного центра при смене уровня
  useEffect(() => {
    if (currentLevel === ViewLevel.GENERAL && currentSite) {
      updateContext({ currentSite: undefined });
      onSiteChange?.(undefined);
    }
  }, [currentLevel, currentSite, updateContext, onSiteChange]);

  // Обработчики
  const { handleStudyChange } = useStudyChange({
    studies,
    updateContext,
    onStudyChange,
    onSiteChange,
    onViewLevelChange,
  });
  
  const handleViewLevelChange = useCallback((level: ViewLevel) => {
    onViewLevelChange?.(level);

    // При переключении на SITE level — автовыбор страны если у пользователя центры только в 1 стране
    if (level === ViewLevel.SITE && currentStudy?.countries?.length === 1) {
      updateContext({ 
        currentLevel: level, 
        currentSite: undefined, 
        currentCountry: currentStudy.countries[0],
        selectedFolder: null 
      });
    } 
    if (level === ViewLevel.GENERAL) {
      updateContext({ 
        currentLevel: level, 
        currentSite: undefined, 
        currentCountry: undefined,
        selectedFolder: null,
        showLastDocuments: true
       });
    }
    if (level === ViewLevel.COUNTRY) {
      updateContext({ 
        currentLevel: level, 
        currentSite: undefined, 
        currentCountry: undefined,
        selectedFolder: null,
        showLastDocuments: false
       });
    }

    // При переключении на SITE level если у пользователя центры в несольких странах - устанавливаем фильтр по странам
    if (currentStudy && level === ViewLevel.SITE && currentStudy?.countries?.length > 1) {
      updateContext({ 
        countryFilter: currentStudy?.countries,
        selectedFolder: null
      });
    }
  }, [updateContext, onViewLevelChange, onSiteChange, countryFilter]);

  const handleSiteChange = useCallback((siteId: string) => {
    const selectedSite = currentStudy &&  currentStudy?.sites?.find(site => Number(site.id) === Number(siteId));
    if (selectedSite && selectedSite.status === SiteStatus.OPENED) {
      // Сохраняем объект центра в контекст
      updateContext({ 
        currentSite: selectedSite,
        selectedFolder: null,
        showLastDocuments: true
       });
    }
  }, [updateContext, onSiteChange]);

  const handleCountryChange = (country: string) => {
    if (currentCountry !== country) {
      updateContext({ 
        currentCountry: country, 
        currentSite: undefined,
        selectedFolder: null,
        showLastDocuments: true
      });
    }
  }

  const handleStudyMap = () => {
    updateContext({ 
      selectedFolder: null,
      showLastDocuments: false,
      currentLevel: undefined,
      currentCountry: undefined,
      currentSite: undefined,
    });
  }

  /* Получаем список стран на основе assigned_site_id пользователя для фильтрации
  * центров по странам
  */
  useEffect(() => {
    const sites = currentStudy?.sites;

    if (!sites || !user?.assigned_site_id?.length) return;

    const assignedCountries = sites
      .filter(site => user.assigned_site_id.includes(Number(site.id)))
      .map(site => site.country)
      .filter((country, index, self) => country && self.indexOf(country) === index);

    // 🔒 Проверка на изменение
    const isSame =
      JSON.stringify(assignedCountries) === JSON.stringify(countryFilter);

    if (!isSame) {
      updateContext({ countryFilter: assignedCountries });
    }

    if (
      assignedCountries.length === 1 &&
      currentCountry !== assignedCountries[0]
    ) {
      updateContext({ currentCountry: assignedCountries[0] });
    }

  }, [
    currentStudy,
    user?.assigned_site_id,
    currentCountry,
    countryFilter
  ]);

  const assignedSites =
    currentStudy?.sites?.some(site =>
      user?.assigned_site_id.includes(Number(site.id))
    ) ?? false;

  const userAssignedCountries = useMemo(() => {
    if (!currentStudy || !user?.assigned_country_by_study) return [];
    return user.assigned_country_by_study[currentStudy.id] || [];
  }, [currentStudy, user]);

  if (authLoading || loading) {
    return (
      <Flex p="1" justify="center" align="center" gap="2" ml="2">
        <Spinner size="2" />
        <Text size="2">{t('loadingStudies')}</Text>
      </Flex>
    );
  }

  if (!studies?.length) {
    return (
      <Flex p="3" justify="center">
        <Text size="2">{t('noStudies')}</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="row" gap="2" >
      {/* Шаг 1: Выбор исследования */}
      <Flex direction="row" gap="2" align="center">
        <Tooltip content="Изменить уровень просмотра">
          <Button
            variant="surface"
            size="2"
            onClick={handleStudyMap}
            mr="3"
          >
            <LuLayers3 />
          </Button>
        </Tooltip>
        <Select.Root
          size="2"
          key={`study-select-${currentStudy?.id}`}
          value={currentStudy?.id?.toString() || undefined}
          onValueChange={handleStudyChange}

        >
          <Select.Trigger placeholder={t('selectStudy')} variant="surface"/>
          <Select.Content>
            {studies
              .filter(study => user?.assigned_study_id?.includes(study.id))
              .map((study) => (
                <Select.Item key={study.id} value={study.id.toString()}>
                  {study.protocol}
                </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {currentStudy && <IoIosArrowForward style={{color: 'gray'}} />}
      </Flex>

      {/* Шаг 2: Выбор уровня просмотра (показываем только если выбрано исследование) */}
      {currentStudy && (
        <Flex direction="row" gap="2" align="center">
          <Select.Root
            size="2"
            key={`level-select-${currentLevel}-${currentStudy.id}`}
            value={currentLevel || undefined}
            onValueChange={(value: ViewLevel) => handleViewLevelChange(value)}
          >
            <Select.Trigger placeholder={t('selectLevel')} />
            <Select.Content>
              <Select.Item value={ViewLevel.GENERAL}>
                <Flex direction="column" gap="1">
                  <Text>{t('generalLevel')}</Text>
                </Flex>
              </Select.Item>

              {/* Показываем уровень страны только если стран в исследовании больше одной */}
              {currentStudy?.countries?.length > 1 && 
              <Select.Item value={ViewLevel.COUNTRY}>
                <Flex direction="column" gap="1">
                  <Text>{t('countryLevel')}</Text>
                </Flex>
              </Select.Item>}

              {/* Показываем уровень центров только если пользователю назначен хотя бы 1 центр в исследовании */}
              {user &&  assignedSites &&  
              <Select.Item value={ViewLevel.SITE}>
                <Flex direction="column" gap="1">
                  <Text>{t('siteLevel')}</Text>
                </Flex>
              </Select.Item>}
            </Select.Content>
          </Select.Root>
          {currentLevel && currentLevel !== ViewLevel.GENERAL && <IoIosArrowForward style={{color: 'gray'}}/>}
        </Flex>
      )}

      {/* Дополнительный фильтр центров по странам.
          Доступен если пользователю добавлены центры в более чем 1 стране */}
      {currentStudy && currentLevel === ViewLevel.SITE && countryFilter && countryFilter.length > 1 ?
       <Flex direction="row" gap="2" align="center">
        <Select.Root
          size="2"
          key={`country-select-${currentCountry}`}
          value={currentCountry || undefined}
          onValueChange={handleCountryChange}
        >
          <Select.Trigger placeholder={t('selectCountry')} />
          <Select.Content>
            {countryFilter.map((country) => (
              <Select.Item key={country} value={country}>
                <Flex direction="column">
                  <Text>{country}</Text>
                </Flex>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {currentCountry && <IoIosArrowForward style={{color: 'gray'}}/>}
      </Flex>
        : null
      }

      {/* Выбор центра */}
      {currentStudy?.sites && currentLevel === ViewLevel.SITE && currentCountry && (
        <Select.Root
          size="2"
          key={`site-select-${currentSite?.id}-${currentStudy.id}`}
          value={currentSite?.id?.toString() || undefined}
          onValueChange={handleSiteChange}
        >
          <Select.Trigger
            placeholder={loading
              ? t('loadingSites')
              : !currentStudy?.sites
                ? t('noSites')
                : t('selectSite')
            }
          />
          <Select.Content>
            {currentStudy?.sites.filter(site => site.country === currentCountry && user?.assigned_site_id?.includes(Number(site.id)))
            .map((site) => (
              <Select.Item 
                key={site.id} 
                value={site.id.toString()}
                disabled={site.status !== SiteStatus.OPENED }
              >
                <Flex direction="row" gap="2" align="center">
                  <Text style={{ fontSize: '0.5em', display: 'inline-flex' }}>
                    {SITE_STATUS_CONFIG[site.status].icon}
                  </Text>
                  <Text>
                    {site.name} №{site.number} {site.status !== SiteStatus.OPENED && `(${SITE_STATUS_CONFIG[site.status].label})` }
                  </Text>
                </Flex>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )}


      {/* Выбор страны  */}
      {currentStudy && currentLevel === ViewLevel.COUNTRY && userAssignedCountries && (
        <Select.Root
          size="2"
          key={`country-select-${currentCountry}`}
          value={currentCountry || undefined}
          onValueChange={handleCountryChange}
        >
          <Select.Trigger placeholder={t('selectCountry')} />
          <Select.Content>
            {/* {(countryFilter?.length ? countryFilter : currentStudy.countries).map((country) => (
              <Select.Item key={country} value={country}>
                <Flex direction="column">
                  <Text>{country}</Text>
                </Flex>
              </Select.Item>
            ))} */}

            {userAssignedCountries.map((country) => (
              <Select.Item key={country} value={country}>
                <Flex direction="column">
                  <Text>{country}</Text>
                </Flex>
              </Select.Item>
            ))}            
          </Select.Content>
        </Select.Root>
      )}

    </Flex>
  );
};

export default Navigation;