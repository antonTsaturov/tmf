'use client'

import { useContext, useEffect, useState, useCallback } from 'react';
import { AdminContext } from '@/wrappers/AdminContext';
import { Select, Flex, Text, Spinner } from '@radix-ui/themes';
import { useAuth } from '@/wrappers/AuthProvider';
import { Study, StudySite } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';
import { IoIosArrowForward } from "react-icons/io";
import React from 'react';
import { ViewLevel } from '@/types/types';

interface StudySiteNavigationProps {
  onStudyChange?: (study: Study | undefined) => void;
  onSiteChange?: (site: StudySite | undefined) => void;
  onViewLevelChange?: (level: ViewLevel | undefined) => void;
}

const StudySiteNavigation: React.FC<StudySiteNavigationProps> = ({
  onStudyChange,
  onSiteChange,
  onViewLevelChange,
}) => {
  const { user, loading: authLoading } = useAuth()!;
  /*
  *  studies - стартовая точка загрузки. Объект studies содержит вложенный объект
  * центров, которые назначены пользователю.
  */
  const { studies, loading } = useContext(AdminContext)!;
  
  const [sites, setSites] = useState<StudySite[]>([]);
  const { context, updateContext } = useContext(MainContext)!;
  const { currentSite, currentStudy, currentLevel, currentCountry } = context;
  const [ countryFilter, setCountryFilter ] = useState<string[]>()

  // Сброс выбранного центра при смене уровня
  useEffect(() => {
    if (currentLevel === ViewLevel.GENERAL && currentSite) {
      updateContext({ currentSite: undefined });
      onSiteChange?.(undefined);
    }
  }, [currentLevel, currentSite, updateContext, onSiteChange]);

  // Обработчики
  const handleStudyChange = useCallback((studyId: string) => {
    const selectedStudy = studies.find((study: Study) => Number(study.id) === Number(studyId));
    
    if (selectedStudy) {
      // Сохраняем объект исследования в контекст
      updateContext({
        currentStudy: selectedStudy,
        currentSite: undefined,
        currentLevel: undefined,
        currentCountry: undefined
      });
      
      // Вызываем колбэки
      onStudyChange?.(selectedStudy);
      onSiteChange?.(undefined);
      onViewLevelChange?.(undefined);
    }
  }, [studies, updateContext, onStudyChange, onSiteChange, onViewLevelChange]);

  const handleViewLevelChange = useCallback((level: ViewLevel) => {
    onViewLevelChange?.(level);
    // Обновляем контекст
    updateContext({ currentLevel: level, currentSite: undefined, currentCountry: undefined });
    onSiteChange?.(undefined);
  }, [updateContext, onViewLevelChange, onSiteChange]);

  const handleSiteChange = useCallback((siteId: string) => {
    const selectedSite = sites.find(site => Number(site.id) === Number(siteId));
    
    if (selectedSite) {
      // Сохраняем объект центра в контекст
      updateContext({ currentSite: selectedSite });
      onSiteChange?.(selectedSite);
    }
  }, [sites, updateContext, onSiteChange]);

  const handleCountryChange = (country: string) => {
    if (currentCountry !== country) {
      updateContext({ currentCountry: country });
    }
  }

  // Обновляем локальный стейт с объектами центров
  useEffect(()=> {
    const sites = currentStudy && studies.find(study => study.id === currentStudy.id)?.sites;
    if (sites)
    setSites(sites)
  }, [currentStudy])

  /* Получаем список стран на основе assigned_site_id пользователя для фильтрации
  * центров по странам
  */ 
  useEffect(() => {
    if (currentLevel === ViewLevel.SITE && user?.assigned_site_id && sites.length > 0) {
      // Фильтруем центры, которые назначены пользователю, и собираем уникальные страны
      const assignedCountries = sites
        .filter(site => user.assigned_site_id.includes(Number(site.id)))
        .map(site => site.country)
        .filter((country, index, self) => country && self.indexOf(country) === index); // Убираем дубликаты

      setCountryFilter(assignedCountries);
      console.log('assignedCountries: ', assignedCountries)
    }
    
    if (currentStudy?.countries.length === 1) {
      //setCountryFilter(currentStudy?.countries);
      updateContext({ currentCountry: String(currentStudy?.countries) })
    }
  }, [currentLevel, user?.assigned_site_id, sites]);


  if (authLoading || loading) {
    return (
      <Flex p="1" justify="center" align="center" gap="2">
        <Spinner size="2" />
        <Text size="2">Загрузка исследований...</Text>
      </Flex>
    );
  }


  if (!studies?.length) {
    return (
      <Flex p="3" justify="center">
        <Text size="2">Нет доступных исследований</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="row" gap="3">
      {/* Шаг 1: Выбор исследования */}
      <Flex direction="row" gap="3" align="center">
        <Select.Root
          size="2"
          key={`study-select-${currentStudy?.id}`}
          value={currentStudy?.id?.toString() || undefined} 
          onValueChange={handleStudyChange}
          
        >
          <Select.Trigger placeholder="Выберите исследование" variant="surface"/>
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
        {currentStudy && <IoIosArrowForward />}
      </Flex>
      
      {/* Шаг 2: Выбор уровня просмотра (показываем только если выбрано исследование) */}
      {currentStudy && (
        <Flex direction="row" gap="3" align="center">
          <Select.Root
            size="2"
            key={`level-select-${currentLevel}-${currentStudy.id}`}
            value={currentLevel || undefined} 
            onValueChange={(value: ViewLevel) => handleViewLevelChange(value)}
          >
            <Select.Trigger placeholder="Выберите уровень" />
            <Select.Content>
              <Select.Item value={ViewLevel.GENERAL}>
                <Flex direction="column" gap="1">
                  <Text>General</Text>
                </Flex>
              </Select.Item>
              {/* Показываем уровень страны только если стран в исследовании больше одной */}
              {currentStudy.countries.length > 1 && <Select.Item value={ViewLevel.COUNTRY}>
                <Flex direction="column" gap="1">
                  <Text>Country Level</Text>
                </Flex>
              </Select.Item>}
              <Select.Item value={ViewLevel.SITE}>
                <Flex direction="column" gap="1">
                  <Text>Site Level</Text>
                </Flex>
              </Select.Item>
            </Select.Content>
          </Select.Root>
          {currentLevel && currentLevel !== ViewLevel.GENERAL && <IoIosArrowForward />}
        </Flex>
      )}
      
      {/* Дополнительный фильтр центров по странам.
          Достпен если пользователю добавлены центры в более чем 1 стране */}
      {currentStudy && currentLevel === ViewLevel.SITE && countryFilter && countryFilter.length > 1 ?
       <Flex direction="row" gap="3" align="center">
        <Select.Root
          size="2"
          key={`country-select-${currentCountry}`}
          value={currentCountry || undefined} 
          onValueChange={handleCountryChange}
          //disabled={loadingSites || !sites.length}
        >
          <Select.Trigger placeholder={"Выберите страну"} />
          <Select.Content>
            {currentLevel === ViewLevel.SITE && countryFilter && (
            countryFilter.map((country) => (
              <Select.Item key={country} value={country}>
                <Flex direction="column">
                  <Text>{country}</Text>
                </Flex>
              </Select.Item>
            )))}
          </Select.Content>
        </Select.Root>
        {currentCountry && <IoIosArrowForward />}
      </Flex>
        : null
      }

      {/* Выбор центра */}
      {currentStudy && currentLevel === ViewLevel.SITE && currentCountry &&
      //|| currentLevel === ViewLevel.SITE && currentStudy?.countries.length === 1 && 
      (
        <Select.Root
          size="2"
          key={`site-select-${currentSite?.id}-${currentStudy.id}`}
          value={currentSite?.id?.toString() || undefined} 
          onValueChange={handleSiteChange}
          //disabled={loadingSites || !sites.length}
        >
          <Select.Trigger 
            placeholder={loading 
              ? "Загрузка центров..." 
              : !sites.length 
                ? "Нет доступных центров" 
                : "Выберите центр"
            } 
          />
          <Select.Content>
            {sites.filter(site => site.country === currentCountry )
            .map((site) => (
              <Select.Item key={site.id} value={site.id.toString()}>
                <Flex direction="column">
                  <Text>{site.name} №{site.number}</Text>
                </Flex>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )}

      
      {/* Выбор страны  */}
      {currentStudy && currentLevel === ViewLevel.COUNTRY && (
        <Select.Root
          size="2"
          key={`country-select-${currentCountry}`}
          value={currentCountry || undefined} 
          onValueChange={handleCountryChange}
          //disabled={loadingSites || !sites.length}
        >
          <Select.Trigger placeholder={"Выберите страну"} />
          <Select.Content>
            {currentLevel === ViewLevel.COUNTRY &&
            currentStudy.countries.map((country) => (
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

export default StudySiteNavigation;