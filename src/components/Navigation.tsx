// // components/StudySiteNavigation.tsx
// 'use client'

// import { useContext, useEffect, useState, useCallback, useRef } from 'react';
// import { AdminContext } from '@/wrappers/AdminContext';
// import { Select, Flex, Text, Button, Spinner } from '@radix-ui/themes';
// import { useAuth } from '@/wrappers/AuthProvider';
// import { Tables } from '@/lib/db/schema';
// import { Study, StudySite } from '@/types/types';
// import { MainContext } from '@/wrappers/MainContext';
// import { IoIosArrowForward } from "react-icons/io";
// import React from 'react';
// import { ViewLevel } from './FileExplorer';

// //type ViewLevel = 'site' | 'general';

// interface StudySiteNavigationProps {
//   onStudyChange?: (study: Study | undefined) => void;
//   onSiteChange?: (site: StudySite | undefined) => void;
//   onViewLevelChange?: (level: ViewLevel | undefined) => void;
// }

// const StudySiteNavigation: React.FC<StudySiteNavigationProps> = ({
//   onStudyChange,
//   onSiteChange,
//   onViewLevelChange,
// }) => {
//   const { user } = useAuth();
//   const { studies, loadTablePartial, loadTable } = useContext(AdminContext)!;
  
  
//   const [sites, setSites] = useState<StudySite[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingSites, setLoadingSites] = useState(false);
//   const { context, updateContext } = useContext(MainContext)!;
//   const { currentSite, currentStudy, currentLevel} = context;

//   // Refs для предотвращения повторных загрузок
//   const loadedStudiesRef = useRef(false);
//   const loadedSitesRef = useRef<Record<number, boolean>>({});

//   // Загружаем исследования один раз при монтировании
//   useEffect(() => {
//     const loadAllStudies = async () => {
//       if (!user?.assigned_study_id || loadedStudiesRef.current) {
//         setLoading(false);
//         console.error('No studies assigned');
//         return;
//       }

//       try {
//         setLoading(true);
//         await loadTable(Tables.STUDY);
//         if (!studies) {
//           return;
//         }
//         loadedStudiesRef.current = true;
        
//       } catch (error) {
//         console.error('Error loading studies:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadAllStudies();
//   }, []); //user?.assigned_study_id

//   // Загружаем центры только при выборе уровня SITE
//   useEffect(() => {
//     const loadStudySites = async () => {
//       if (!currentStudy || !user?.assigned_site_id) {
//         setSites([]);
//         return;
//       }

//       if (currentLevel === ViewLevel.SITE)
//       try {
        
//         setLoadingSites(true);
//         const sitesData = await loadTablePartial(Tables.SITE, currentStudy.id);

//         // Фильтруем только ассигнированные центры
//         const studySites = sitesData?.filter((site: StudySite) => {
//             const siteId = typeof site.id === 'string' ? Number(site.id) : site.id;
//             return site.study_id === Number(currentStudy.id) && user?.assigned_site_id?.includes(siteId);
//         });

//         setSites(studySites);
//         loadedSitesRef.current[currentStudy.id] = true;
        
//         // Автовыбор центра если он один и выбран Site Level
//         // if (studySites.length === 1 && currentLevel === 'site' && !currentSite) {
//         //   updateContext({currentSite: studySite});
//         //   onSiteChange?.(studySites[0].id);
//         // }
//       } catch (error) {
//         console.error('Error loading sites:', error);
//         setSites([]);
//       } finally {
//         setLoadingSites(false);
//       }
//     };

//     if (currentStudy) {
//       loadStudySites();
//     }
//   }, [currentLevel]); //user?.assigned_site_id, 

//   // Сброс выбранного центра при смене уровня
//   useEffect(() => {
//     if (currentLevel === 'general' && currentSite) {
//       updateContext({currentSite: undefined});
//       onSiteChange?.(undefined);
//     }
//   }, [currentLevel]);

//   // Обработчики
//   const handleStudyChange = useCallback((studyId: string) => {

//     //console.log(studyId, studies )
//     const selectedStudy = studies.filter((study: Study) => Number(study.id) === Number(studyId))
//     console.log('selectedStudy: ', selectedStudy)
//     updateContext({
//       currentStudy: selectedStudy[0],
//       currentSite: undefined,
//       currentLevel: undefined
//     })
    
//     // Вызываем колбэки
//     onStudyChange?.(selectedStudy[0]);
//     onSiteChange?.(undefined);
//     onViewLevelChange?.(undefined);

//     console.log('currentStudy: ', currentStudy)
        
//   }, [onStudyChange, onSiteChange, onViewLevelChange]);

//   const handleViewLevelChange = useCallback((level: ViewLevel) => {
//     onViewLevelChange?.(level);
//     updateContext({ currentLevel: level });
    
//     // Если выбран General, сбрасываем выбранный центр
//     if (level === 'general') {
//       updateContext({currentSite: undefined})
//       onSiteChange?.(undefined);
//     }
//   }, [onViewLevelChange]);

//   const handleSiteChange = useCallback((siteId: string) => {
//     const selectedSite = sites.find(site => site.id === Number(siteId));
//     updateContext({currentSite: selectedSite})
//     onSiteChange?.(selectedSite);
//   }, [onSiteChange]);

//   if (loading) {
//     return (
//       <Flex p="3" justify="center" align="center" gap="2">
//         <Spinner size="2" />
//         <Text size="2" >Загрузка исследований...</Text>
//       </Flex>
//     );
//   }

//   if (!studies?.length) {
//     return (
//       <Flex p="3" justify="center">
//         <Text size="2" >Нет доступных исследований</Text>
//       </Flex>
//     );
//   }

//   return (
//     <Flex direction="row" gap="3" pb="3">
//       {/* Шаг 1: Выбор исследования */}
//       <Flex direction="column" gap="1">
//         <Text size="1" weight="medium">Исследование</Text>
//         <Select.Root 
//           key={`study-select-${currentStudy}`} // Добавляем key для принудительного обновления
//           value={currentStudy?.toString() || undefined} 
//           onValueChange={handleStudyChange}
//         >
//           <Select.Trigger placeholder="Выберите исследование" />
//           <Select.Content>
//             {studies
//             .filter(study => user?.assigned_study_id.includes(study.id))
//             .map((study) => (
//                 <Select.Item key={study.id} value={study.id.toString()}>
//                   {study.protocol}
//                 </Select.Item>
//             ))}
//           </Select.Content>
//         </Select.Root>
//       </Flex>
//       <div style={{marginTop: '25px'}}>
//         {currentStudy && <IoIosArrowForward />}
//       </div>
//       {/* Шаг 2: Выбор уровня просмотра (показываем только если выбрано исследование) */}
//       {currentStudy && (
//         <Flex direction="column" gap="1">
//           <Text size="1" weight="medium">Уровень</Text>
//           <Select.Root 
//             key={`level-select-${currentLevel}-${currentStudy}`} // Добавляем key для принудительного обновления
//             value={currentLevel || undefined} 
//             onValueChange={(value: ViewLevel) => handleViewLevelChange(value)}
//           >
//             <Select.Trigger placeholder="Выберите уровень" />
//             <Select.Content>
//               <Select.Item value="site">
//                 <Flex direction="column" gap="1">
//                   <Text >Site Level</Text>
//                 </Flex>
//               </Select.Item>
//               <Select.Item value="general">
//                 <Flex direction="column" gap="1">
//                   <Text >General</Text>
//                 </Flex>
//               </Select.Item>
//             </Select.Content>
//           </Select.Root>
//         </Flex>
//       )}
//       <div style={{marginTop: '25px'}}>
//         {currentLevel === ViewLevel.SITE && <IoIosArrowForward />}
//       </div>
//       {/* Шаг 3: Выбор центра (только если выбран Site Level) */}
//       {currentStudy && currentLevel === 'site' && (
//         <Flex direction="column" gap="1">
//           <Text size="1" weight="medium" >Центр</Text>
//           <Select.Root 
//             key={`site-select-${currentSite}-${currentStudy}`} // Добавляем key для принудительного обновления
//             value={currentSite?.toString() || undefined} 
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
//                   <Flex direction="column">
//                     <Text>{site.name} №{site.number}</Text>
//                   </Flex>
//                 </Select.Item>
//               ))}
//             </Select.Content>
//           </Select.Root>
          
//           {/* Подсказка если центры не загружены */}
//           {/* {!loadingSites && sites.length === 0 && (
//             <Text size="1" color="red" mt="1">
//               ⚠ У вас нет доступа к центрам в этом исследовании
//             </Text>
//           )} */}
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
import { ViewLevel } from './FileExplorer';
import { log } from 'console';

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
  const { user } = useAuth();
  const { studies, loadTablePartial, loadTable } = useContext(AdminContext)!;
  
  const [sites, setSites] = useState<StudySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSites, setLoadingSites] = useState(false);
  const { context, updateContext } = useContext(MainContext)!;
  const { currentSite, currentStudy, currentLevel } = context;

  // Refs для предотвращения повторных загрузок
  const loadedStudiesRef = useRef(false);
  const loadedSitesRef = useRef<Record<number, boolean>>({});

  // Загружаем исследования один раз при монтировании
  useEffect(() => {
    const loadAllStudies = async () => {
      if (!user?.assigned_study_id || loadedStudiesRef.current) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await loadTable(Tables.STUDY);
        loadedStudiesRef.current = true;
      } catch (error) {
        console.error('Error loading studies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllStudies();
  }, [user?.assigned_study_id, loadTable]); // Добавлена зависимость loadTable

  // Загружаем центры только при выборе уровня SITE
  useEffect(() => {
    const loadStudySites = async () => {
      if (!currentStudy || !user?.assigned_site_id) {
        setSites([]);
        return;
      }

      // Проверяем, загружали ли уже центры для этого исследования
      if (loadedSitesRef.current[currentStudy.id]) {
        return;
      }

      if (currentLevel === ViewLevel.SITE) {
        try {
          setLoadingSites(true);
          const sitesData = await loadTablePartial(Tables.SITE, currentStudy.id);

          // Фильтруем только ассигнированные центры
          const studySites = sitesData?.filter((site: StudySite) => {
            const siteId = typeof site.id === 'string' ? Number(site.id) : site.id;
            return site.study_id === Number(currentStudy.id) && user?.assigned_site_id?.includes(siteId);
          });

          setSites(studySites);
          loadedSitesRef.current[currentStudy.id] = true;
          
        } catch (error) {
          console.error('Error loading sites:', error);
          setSites([]);
        } finally {
          setLoadingSites(false);
        }
      }
    };

    loadStudySites();
  }, [currentLevel, currentStudy, user?.assigned_site_id, loadTablePartial]);

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
        currentLevel: undefined
      });
      
      // Вызываем колбэки
      onStudyChange?.(selectedStudy);
      onSiteChange?.(undefined);
      onViewLevelChange?.(undefined);
    }
  }, [studies, updateContext, onStudyChange, onSiteChange, onViewLevelChange]);

  const handleViewLevelChange = useCallback((level: ViewLevel) => {
    // Сохраняем уровень в контекст
    updateContext({ currentLevel: level });
    onViewLevelChange?.(level);
    
    // Если выбран General, сбрасываем выбранный центр
    if (level === ViewLevel.GENERAL) {
      updateContext({ currentSite: undefined });
      onSiteChange?.(undefined);
    }
  }, [updateContext, onViewLevelChange, onSiteChange]);

  const handleSiteChange = useCallback((siteId: string) => {
    const selectedSite = sites.find(site => Number(site.id) === Number(siteId));
    
    if (selectedSite) {
      // Сохраняем объект центра в контекст
      updateContext({ currentSite: selectedSite });
      onSiteChange?.(selectedSite);
    }
  }, [sites, updateContext, onSiteChange]);

  if (loading) {
    return (
      <Flex p="3" justify="center" align="center" gap="2">
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
    <Flex direction="row" gap="3" pb="3">
      {/* Шаг 1: Выбор исследования */}
      <Flex direction="column" gap="1">
        <Text size="1" weight="medium">Исследование</Text>
        <Select.Root 
          key={`study-select-${currentStudy?.id}`}
          value={currentStudy?.id?.toString() || undefined} 
          onValueChange={handleStudyChange}
        >
          <Select.Trigger placeholder="Выберите исследование" />
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
      </Flex>
      
      <div style={{marginTop: '25px'}}>
        {currentStudy && <IoIosArrowForward />}
      </div>
      
      {/* Шаг 2: Выбор уровня просмотра (показываем только если выбрано исследование) */}
      {currentStudy && (
        <Flex direction="column" gap="1">
          <Text size="1" weight="medium">Уровень</Text>
          <Select.Root 
            key={`level-select-${currentLevel}-${currentStudy.id}`}
            value={currentLevel || undefined} 
            onValueChange={(value: ViewLevel) => handleViewLevelChange(value)}
          >
            <Select.Trigger placeholder="Выберите уровень" />
            <Select.Content>
              <Select.Item value={ViewLevel.SITE}>
                <Flex direction="column" gap="1">
                  <Text>Site Level</Text>
                </Flex>
              </Select.Item>
              <Select.Item value={ViewLevel.GENERAL}>
                <Flex direction="column" gap="1">
                  <Text>General</Text>
                </Flex>
              </Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>
      )}
      
      <div style={{marginTop: '25px'}}>
        {currentLevel === ViewLevel.SITE && <IoIosArrowForward />}
      </div>
      
      {/* Шаг 3: Выбор центра (только если выбран Site Level) */}
      {currentStudy && currentLevel === ViewLevel.SITE && (
        <Flex direction="column" gap="1">
          <Text size="1" weight="medium">Центр</Text>
          <Select.Root 
            key={`site-select-${currentSite?.id}-${currentStudy.id}`}
            value={currentSite?.id?.toString() || undefined} 
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
        </Flex>
      )}
    </Flex>
  );
};

export default StudySiteNavigation;