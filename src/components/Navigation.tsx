// // components/StudySiteNavigation.tsx
// 'use client'

// import { useContext, useEffect, useState, useCallback, useRef } from 'react';
// import { AdminContext } from '@/wrappers/AdminContext';
// import { Select, Flex, Text, Button, Spinner } from '@radix-ui/themes';
// import { useAuth } from '@/wrappers/AuthProvider';
// import { Tables } from '@/lib/db/schema';
// import { Study, StudySite } from '@/types/types';

// interface StudySiteNavigationProps {
//   onStudyChange?: (studyId: number | null) => void;
//   onSiteChange?: (siteId: number | null) => void;
//   defaultStudyId?: number;
//   defaultSiteId?: number;
// }

// const StudySiteNavigation: React.FC<StudySiteNavigationProps> = ({
//   onStudyChange,
//   onSiteChange,
//   defaultStudyId,
//   defaultSiteId
// }) => {
//   const { studies, loadTablePartial, loadTable } = useContext(AdminContext)!;
//   const { user } = useAuth();
  
//   const [sites, setSites] = useState<StudySite[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingSites, setLoadingSites] = useState(false);
//   //const [currentStudyID, setcurrentStudyID] = useState<number | null>(defaultStudyId || null);
//   //const [currentSiteID, setCurrentSiteID] = useState<number | null>(defaultSiteId || null);
//   const { currentStudyID, setCurrentStudyID, currentSiteID, setCurrentSiteID } = useContext(AdminContext)!;

  
//   // Refs для предотвращения повторных загрузок
//   const loadedStudiesRef = useRef(false);
//   const loadedSitesRef = useRef<Record<number, boolean>>({});

//   // Загружаем исследования один раз при монтировании
//   useEffect(() => {
//     const loadUserStudies = async () => {
//       if (!user?.assigned_study_id || loadedStudiesRef.current) {
//         setLoading(false);
//         return;
//       }

//       try {
//         setLoading(true);
//         await loadTable(Tables.STUDY);
//         if (!studies) {
//           return;
//         }
//         //setStudies(studiesData);
//         loadedStudiesRef.current = true;
        
//         // Автовыбор при одном исследовании
//         // if (studies && studies?.length === 1 && !currentStudyID) {
//         //   setCurrentStudyID(studies[0].id);
//         //   onStudyChange?.(studies[0].id);
//         // }
//       } catch (error) {
//         console.error('Error loading studies:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadUserStudies();
//   }, [user?.assigned_study_id]); // Только при изменении assigned_study_id

//   // Загружаем центры только при смене исследования
//   useEffect(() => {
//     const loadStudySites = async () => {

//       if (!currentStudyID || !user?.assigned_site_id) {
//         setSites([]);
//         return;
//       }

//       try {
//         setLoadingSites(true);
//         const sitesData = await loadTablePartial(Tables.SITE, currentStudyID);

//         // Фильтруем только ассигнированные центры. Пользователь увидит только те центры, которые ему присвоены
//         const studySites = sitesData?.filter((site: StudySite) => {
//             const siteId = typeof site.id === 'string' ? Number(site.id) : site.id;
//             return site.study_id === currentStudyID && 
//                     user?.assigned_site_id?.includes(siteId);
//         }) || [];

//         setSites(studySites);
//         loadedSitesRef.current[currentStudyID] = true;
        
//         if (studySites.length === 1 && !currentSiteID) {
//           setCurrentSiteID(studySites[0].id);
//           onSiteChange?.(studySites[0].id);
//         }
//       } catch (error) {
//         console.error('Error loading sites:', error);
//         setSites([]);
//       } finally {
//         setLoadingSites(false);
//       }
//     };

//     loadStudySites();
//   }, [currentStudyID, user?.assigned_site_id]); // Только при смене исследования или assigned_site_id

//   // Обработчики
//   const handleStudyChange = useCallback((studyId: string) => {
//     const numericId = Number(studyId);
//     setCurrentStudyID(numericId);
//     setCurrentSiteID(null);
//     onStudyChange?.(numericId);
//     onSiteChange?.(null);
//   }, [onStudyChange, onSiteChange]);

//   const handleSiteChange = useCallback((siteId: string) => {
//     const numericId = Number(siteId);
//     setCurrentSiteID(numericId);
//     onSiteChange?.(numericId);
//   }, [onSiteChange]);

//   if (loading) {
//     return (
//       <Flex p="3" justify="center" align="center" gap="2">
//         <Spinner size="2" />
//         <Text size="2" color="gray">Загрузка исследований...</Text>
//       </Flex>
//     );
//   }

//   if (!studies?.length) {
//     return (
//       <Flex p="3" justify="center">
//         <Text size="2" color="gray">Нет доступных исследований</Text>
//       </Flex>
//     );
//   }

//   return (
//     <Flex direction="column" gap="3" pb="3" style={{ borderBottom: '1px solid var(--gray-5)' }}>
//       {/* Селект исследований */}
//       <Flex direction="column" gap="1">
//         <Text size="1" weight="medium" color="gray">Исследование</Text>
//         <Select.Root 
//           value={currentStudyID?.toString() || undefined} 
//           onValueChange={handleStudyChange}
//         >
//           <Select.Trigger placeholder="Выберите исследование" />
//           <Select.Content>
//             {studies
//             .filter(study => user?.assigned_study_id.includes( study.id))
//             .map((study) => (
//                 <Select.Item key={study.id} value={study.id.toString()}>
//                 {study.protocol}
//                 </Select.Item>
//             ))}
//           </Select.Content>
//         </Select.Root>
//       </Flex>

//       {/* Селект центров */}
//       {currentStudyID && (
//         <Flex direction="column" gap="1">
//           <Text size="1" weight="medium" color="gray">Центр</Text>
//           <Select.Root 
//             value={currentSiteID?.toString() || undefined} 
//             onValueChange={handleSiteChange}
//             disabled={loadingSites || !sites.length}
//           >
//             <Select.Trigger 
//               placeholder={loadingSites 
//                 ? "Загрузка центров..." 
//                 : !sites.length 
//                   ? "Нет доступных центров" 
//                   : "Выберите центр"
//               } 
//             />
//             <Select.Content>
//               {sites.map((site) => (
//                 <Select.Item key={site.id} value={site.id.toString()}>
//                   {site.name} {site.number ? `(№${site.number})` : ''}
//                 </Select.Item>
//               ))}
//             </Select.Content>
//           </Select.Root>
//         </Flex>
//       )}
//     </Flex>
//   );
// };

// export default StudySiteNavigation;

// components/StudySiteNavigation.tsx
'use client'

import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AdminContext } from '@/wrappers/AdminContext';
import { Select, Flex, Text, Button, Spinner } from '@radix-ui/themes';
import { useAuth } from '@/wrappers/AuthProvider';
import { Tables } from '@/lib/db/schema';
import { Study, StudySite } from '@/types/types';
import { MainContext } from '@/wrappers/MainContext';
import { IoIosArrowForward } from "react-icons/io";
import React from 'react';

type ViewLevel = 'site' | 'general';

interface StudySiteNavigationProps {
  onStudyChange?: (studyId: number | null) => void;
  onSiteChange?: (siteId: number | null) => void;
  onViewLevelChange?: (level: ViewLevel | null) => void;
  defaultStudyId?: number;
  defaultSiteId?: number;
  defaultViewLevel?: ViewLevel;
}

const StudySiteNavigation: React.FC<StudySiteNavigationProps> = ({
  onStudyChange,
  onSiteChange,
  onViewLevelChange,
  defaultStudyId,
  defaultSiteId,
  defaultViewLevel = 'site'
}) => {
  const { studies, loadTablePartial, loadTable } = useContext(AdminContext)!;
  const { user } = useAuth();
  
  const [sites, setSites] = useState<StudySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSites, setLoadingSites] = useState(false);
  const [viewLevel, setViewLevel] = useState<ViewLevel | null>(null);
  // Context
  const { currentStudyID, setCurrentStudyID, currentSiteID, setCurrentSiteID } = useContext(AdminContext)!;
  const { updateContext } = useContext(MainContext)!;

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
        await loadTable(Tables.STUDY);
        if (!studies) {
          return;
        }
        loadedStudiesRef.current = true;
      } catch (error) {
        console.error('Error loading studies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserStudies();
  }, [user?.assigned_study_id]);

  // Загружаем центры только при смене исследования
  useEffect(() => {
    const loadStudySites = async () => {
      if (!currentStudyID || !user?.assigned_site_id) {
        setSites([]);
        return;
      }

      try {
        setLoadingSites(true);
        const sitesData = await loadTablePartial(Tables.SITE, currentStudyID);

        // Фильтруем только ассигнированные центры
        const studySites = sitesData?.filter((site: StudySite) => {
            const siteId = typeof site.id === 'string' ? Number(site.id) : site.id;
            return site.study_id === currentStudyID && 
                    user?.assigned_site_id?.includes(siteId);
        }) || [];

        setSites(studySites);
        loadedSitesRef.current[currentStudyID] = true;
        
        // Автовыбор центра если он один и выбран Site Level
        if (studySites.length === 1 && viewLevel === 'site' && !currentSiteID) {
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

    if (currentStudyID) {
      loadStudySites();
    }
  }, [currentStudyID, user?.assigned_site_id, viewLevel]);

  // Сброс выбранного центра при смене уровня
  useEffect(() => {
    if (viewLevel === 'general' && currentSiteID) {
      setCurrentSiteID(null);
      onSiteChange?.(null);
    }
  }, [viewLevel]);

  // Обработчики
  const handleStudyChange = useCallback((studyId: string) => {
    const numericId = Number(studyId);
    
    // Сбрасываем все состояния
    setCurrentStudyID(numericId);
    setCurrentSiteID(null);
    setViewLevel(null); // Явно сбрасываем уровень в null
    updateContext({ currentLevel: null });
    
    // Вызываем колбэки
    onStudyChange?.(numericId);
    onSiteChange?.(null);
    onViewLevelChange?.(null); // Передаем null в колбэк
        
  }, [onStudyChange, onSiteChange, onViewLevelChange]);

  const handleViewLevelChange = useCallback((level: ViewLevel) => {
    setViewLevel(level);
    onViewLevelChange?.(level);
    updateContext({ currentLevel: level });
    
    // Если выбран General, сбрасываем выбранный центр
    if (level === 'general') {
      setCurrentSiteID(null);
      onSiteChange?.(null);
    }
  }, [onViewLevelChange]);

  const handleSiteChange = useCallback((siteId: string) => {
    const numericId = Number(siteId);
    setCurrentSiteID(numericId);
    onSiteChange?.(numericId);
  }, [onSiteChange]);

  if (loading) {
    return (
      <Flex p="3" justify="center" align="center" gap="2">
        <Spinner size="2" />
        <Text size="2" >Загрузка исследований...</Text>
      </Flex>
    );
  }

  if (!studies?.length) {
    return (
      <Flex p="3" justify="center">
        <Text size="2" >Нет доступных исследований</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="row" gap="3" pb="3">
      {/* Шаг 1: Выбор исследования */}
      <Flex direction="column" gap="1">
        <Text size="1" weight="medium">Исследование</Text>
        <Select.Root 
          key={`study-select-${currentStudyID}`} // Добавляем key для принудительного обновления
          value={currentStudyID?.toString() || undefined} 
          onValueChange={handleStudyChange}
        >
          <Select.Trigger placeholder="Выберите исследование" />
          <Select.Content>
            {studies
            .filter(study => user?.assigned_study_id.includes(study.id))
            .map((study) => (
                <Select.Item key={study.id} value={study.id.toString()}>
                  {study.protocol}
                </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>
      <div style={{marginTop: '25px'}}>
        {currentStudyID && <IoIosArrowForward />}
      </div>
      {/* Шаг 2: Выбор уровня просмотра (показываем только если выбрано исследование) */}
      {currentStudyID && (
        <Flex direction="column" gap="1">
          <Text size="1" weight="medium">Уровень</Text>
          <Select.Root 
            key={`level-select-${viewLevel}-${currentStudyID}`} // Добавляем key для принудительного обновления
            value={viewLevel || undefined} 
            onValueChange={(value: ViewLevel) => handleViewLevelChange(value)}
          >
            <Select.Trigger placeholder="Выберите уровень" />
            <Select.Content>
              <Select.Item value="site">
                <Flex direction="column" gap="1">
                  <Text >Site Level</Text>
                </Flex>
              </Select.Item>
              <Select.Item value="general">
                <Flex direction="column" gap="1">
                  <Text >General</Text>
                </Flex>
              </Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>
      )}
      <div style={{marginTop: '25px'}}>
        {currentSiteID && <IoIosArrowForward />}
      </div>
      {/* Шаг 3: Выбор центра (только если выбран Site Level) */}
      {currentStudyID && viewLevel === 'site' && (
        <Flex direction="column" gap="1">
          <Text size="1" weight="medium" >Центр</Text>
          <Select.Root 
            key={`site-select-${currentSiteID}-${currentStudyID}`} // Добавляем key для принудительного обновления
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
                  <Flex direction="column">
                    <Text>{site.name} №{site.number}</Text>
                  </Flex>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          
          {/* Подсказка если центры не загружены */}
          {!loadingSites && sites.length === 0 && (
            <Text size="1" color="red" mt="1">
              ⚠ У вас нет доступа к центрам в этом исследовании
            </Text>
          )}
        </Flex>
      )}
    </Flex>
  );
};

export default StudySiteNavigation;