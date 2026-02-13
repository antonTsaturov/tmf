// components/StudySiteNavigation.tsx
'use client'

import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AdminContext } from '@/wrappers/AdminContext';
import { Select, Flex, Text, Button, Spinner } from '@radix-ui/themes';
import { useAuth } from '@/wrappers/AuthProvider';
import { Tables } from '@/lib/db/schema';
import { Study, StudySite } from '@/types/types';

interface StudySiteNavigationProps {
  onStudyChange?: (studyId: number | null) => void;
  onSiteChange?: (siteId: number | null) => void;
  defaultStudyId?: number;
  defaultSiteId?: number;
}

const StudySiteNavigation: React.FC<StudySiteNavigationProps> = ({
  onStudyChange,
  onSiteChange,
  defaultStudyId,
  defaultSiteId
}) => {
  const { studies, loadTablePartial } = useContext(AdminContext)!;
  const { user } = useAuth();
  
  const [sites, setSites] = useState<StudySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSites, setLoadingSites] = useState(false);
  //const [currentStudyID, setcurrentStudyID] = useState<number | null>(defaultStudyId || null);
  //const [currentSiteID, setCurrentSiteID] = useState<number | null>(defaultSiteId || null);
  const { currentStudyID, setCurrentStudyID, currentSiteID, setCurrentSiteID } = useContext(AdminContext)!;

  
  // Refs для предотвращения повторных загрузок
  const loadedStudiesRef = useRef(false);
  const loadedSitesRef = useRef<Record<number, boolean>>({});

  // Загружаем исследования один раз при монтировании
  useEffect(() => {
    const loadUserStudies = async () => {
      if (!user?.assigned_study_id || loadedStudiesRef.current) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const studiesData = await loadTablePartial(Tables.STUDY, user.assigned_study_id);
        //setStudies(studiesData);
        loadedStudiesRef.current = true;
        
        // Автовыбор при одном исследовании
        if (studiesData?.length === 1 && !currentStudyID) {
          setCurrentStudyID(studiesData[0].id);
          onStudyChange?.(studiesData[0].id);
        }
      } catch (error) {
        console.error('Error loading studies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserStudies();
  }, [user?.assigned_study_id]); // Только при изменении assigned_study_id

  // Загружаем центры только при смене исследования
  useEffect(() => {
    const loadStudySites = async () => {

      if (!currentStudyID || !user?.assigned_site_id) {
        setSites([]);
        return;
      }

      try {
        setLoadingSites(true);
        const sitesData = await loadTablePartial(Tables.SITE, user?.assigned_study_id);

        // Фильтруем только ассигнированные центры. Пользователь увидит только те центры, которые ему присвоены
        const studySites = sitesData?.filter((site: StudySite) => {
            const siteId = typeof site.id === 'string' ? Number(site.id) : site.id;
            return site.study_id === currentStudyID && 
                    user?.assigned_site_id?.includes(siteId);
        }) || [];

        setSites(studySites);
        loadedSitesRef.current[currentStudyID] = true;
        
        if (studySites.length === 1 && !currentSiteID) {
          setCurrentSiteID(studySites[0].id);
          onSiteChange?.(studySites[0].id);
        }
      } catch (error) {
        console.error('Error loading sites:', error);
        setSites([]);
      } finally {
        setLoadingSites(false);
      }
    };

    loadStudySites();
  }, [currentStudyID, user?.assigned_site_id]); // Только при смене исследования или assigned_site_id

  // Обработчики
  const handleStudyChange = useCallback((studyId: string) => {
    const numericId = Number(studyId);
    setCurrentStudyID(numericId);
    setCurrentSiteID(null);
    onStudyChange?.(numericId);
    onSiteChange?.(null);
  }, [onStudyChange, onSiteChange]);

  const handleSiteChange = useCallback((siteId: string) => {
    const numericId = Number(siteId);
    setCurrentSiteID(numericId);
    onSiteChange?.(numericId);
  }, [onSiteChange]);

  const handleApply = useCallback(() => {
    console.log('Applied context:', {
      studyId: currentStudyID,
      siteId: currentSiteID,
      study: studies.find(s => s.id === currentStudyID),
      site: sites.find(s => s.id === currentSiteID)
    });
  }, [currentStudyID, currentSiteID, studies, sites]);

  if (loading) {
    return (
      <Flex p="3" justify="center" align="center" gap="2">
        <Spinner size="2" />
        <Text size="2" color="gray">Загрузка исследований...</Text>
      </Flex>
    );
  }

  if (!studies?.length) {
    return (
      <Flex p="3" justify="center">
        <Text size="2" color="gray">Нет доступных исследований</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3" p="3" style={{ borderBottom: '1px solid var(--gray-5)' }}>
      {/* Селект исследований */}
      <Flex direction="column" gap="1">
        <Text size="1" weight="medium" color="gray">Исследование</Text>
        <Select.Root 
          value={currentStudyID?.toString() || undefined} 
          onValueChange={handleStudyChange}
        >
          <Select.Trigger placeholder="Выберите исследование" />
          <Select.Content>
            {studies
            .filter(study => user?.assigned_study_id == study.id)
            .map((study) => (
                <Select.Item key={study.id} value={study.id.toString()}>
                {study.protocol}
                </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      {/* Селект центров */}
      {currentStudyID && (
        <Flex direction="column" gap="1">
          <Text size="1" weight="medium" color="gray">Центр</Text>
          <Select.Root 
            value={currentSiteID?.toString() || undefined} 
            onValueChange={handleSiteChange}
            disabled={loadingSites || !sites.length}
          >
            <Select.Trigger 
              placeholder={loadingSites 
                ? "Загрузка центров..." 
                : !sites.length 
                  ? "Нет доступных центров" 
                  : "Выберите центр"
              } 
            />
            <Select.Content>
              {sites.map((site) => (
                <Select.Item key={site.id} value={site.id.toString()}>
                  {site.name} {site.number ? `(№${site.number})` : ''}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      )}
    </Flex>
  );
};

export default StudySiteNavigation;