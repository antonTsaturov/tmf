// src/components/ui/StudyHierarchy.tsx


import { Box, Flex, Text, Card, Heading, Badge, Separator, Button, Tooltip, ScrollArea } from '@radix-ui/themes';
import { GlobeIcon } from '@radix-ui/react-icons';
import { useContext, useMemo, useState } from 'react';
import { MainContext, MainContextProps } from '@/wrappers/MainContext';
import { StudySite, ViewLevel } from '@/types/types';
import { FaRegBuilding, FaClinicMedical } from "react-icons/fa";
import { useAuth } from '@/wrappers/AuthProvider';
import { StudyStatusLabels, StudyStatusColors } from '@/types/study';


export const StudyMap = () => {
  const { context, updateContext } = useContext(MainContext)!;
  const { user } = useAuth();
  const { currentStudy } = context!;
  const [isHovered, setIsHovered] = useState(false);

const hierarchyData = useMemo(() => {
  if (!currentStudy?.sites || currentStudy.sites.length === 0) {
    return { studyName: currentStudy?.title || 'No Study', countries: [], studyCountries: [] };
  }

  // Получаем страны, назначенные пользователю для этого исследования
  const userAssignedCountries = user?.assigned_country_by_study?.[currentStudy.id] || [];

  // Группировка сайтов по стране
  const countriesMap = new Map<string, typeof currentStudy.sites>();
  console.log(' [userAssignedCountries]', userAssignedCountries);
  
  currentStudy.sites.forEach((site) => {
    const country = site.country;
    if (!countriesMap.has(country)) {
      countriesMap.set(country, []);
    }
    countriesMap.get(country)!.push(site);
  });

  // Преобразуем Map в массив объектов для отображения
  // Фильтруем только те страны, которые назначены пользователю
  const countries = Array.from(countriesMap.entries())
    //.filter(([country]) => userAssignedCountries.includes(country))
    .map(([country, sites]) => ({
      name: country,
      hasSites: true,
      sites: sites
        .filter(site => user?.assigned_site_id?.includes(Number(site.id)) || false)
        .map((site: StudySite) => ({
          id: site.id,
          study_id: site.study_id,
          study_protocol: site.study_protocol,
          country: site.country,
          name: site.name,
          city: site.city,
          principal_investigator: site.principal_investigator,
          status: site.status,
          number: site.number
        }))
    }));

  // Создаем массив стран из currentStudy.countries, фильтруя по назначенным пользователю
  const studyCountries = (currentStudy.countries || [])
    .filter(country => userAssignedCountries.includes(country)) // ← Добавьте эту фильтрацию
    .map(country => ({
      name: country,
      hasSites: countriesMap.has(country),
      siteCount: countriesMap.get(country)?.length || 0
    }));

  return {
    studyName: currentStudy.title || currentStudy.protocol || 'Untitled Study',
    protocol: currentStudy.protocol,
    sponsor: currentStudy.sponsor,
    countries,
    studyCountries
  };
}, [currentStudy, user]); // ← Добавьте user в зависимости  

  // Функция для получения цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'opened': return 'green';
      case 'closed': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  // Функция для форматирования статуса на русском
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'opened': return 'Открыт';
      case 'closed': return 'Закрыт';
      case 'pending': return 'Ожидает';
      default: return status;
    }
  };

  const handleStudyMapClick = (target: string | StudySite | undefined ) => {
    if (typeof target === 'string') {
      handleCountry(target);
    } else if (typeof target === 'object') {
      handleSite(target);
    } else {
      handleGeneral();
    }
  };

  const handleGeneral = () => {
    updateContext({ 
      currentLevel: ViewLevel.GENERAL,
      currentCountry: undefined,
      showLastDocuments: true
    });
  };

  const handleCountry = (country: string) => {
    updateContext({ 
      currentLevel: ViewLevel.COUNTRY, 
      currentCountry: country,
      showLastDocuments: true
    });
  };

  const handleSite = (site: StudySite) => {
    const updates: Partial<MainContextProps> = {
      currentLevel: ViewLevel.SITE,
      currentCountry: site.country,
      currentSite: site,
      showLastDocuments: true
    };
        
    updateContext(updates);
  };

  return (
    <Card m="4" size="3" style={{ width: '100%', maxWidth: '1000px', minHeight: 0, overflow: 'hidden' }}>
      <Flex justify="between" pb="4" align="center">
        {/* Кнопка назад */}
        <Tooltip content="Вернуться к выбору исследования">
          <Button
            variant="ghost"
            size="2"
            onClick={() => {
              updateContext({ currentStudy: undefined });
            }}
            style={{ cursor: 'pointer' }}
          >
            Назад
          </Button>
        </Tooltip>
      </Flex>


      <Flex direction="column" gap="4" style={{  minHeight: 0, overflow: 'hidden'  }}>
        {/* колонки с иерархиями */}
        <Flex gap="4" style={{  minHeight: 0, overflow: 'hidden'  }}>
          {/* Страны исследования. Показываем если стран больше одной */}
          <Flex gap="2" direction="column">
            <Flex align="center" gap="2">
              <FaClinicMedical color="var(--accent-9)" />
              <Text weight="bold" size="2">Уровень исследования</Text>
            </Flex>
            <Separator size="4" />
            <Tooltip content="Открыть осноной уровень исследования">
              <Card 
                variant="classic" 
                size="2" 
                style={{ 
                  flex: 1, 
                  maxWidth: '200px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none' 
                }} 
                onClick={()=>handleStudyMapClick(undefined)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}            
              >
                <Heading  size="2" style={{ lineHeight: 1.3 }}>
                  {hierarchyData.protocol}
                </Heading>
                {hierarchyData.protocol && (
                  <Flex gap="5" mt="2" mb="2" direction="column">
                    {/* <Text size="1" color="gray">Study title: {hierarchyData.studyName}</Text> */}
                    <Text size="1" color="gray">Sponsor name: {hierarchyData.sponsor}</Text>
                  </Flex>
                )}
                {/* Статус исследования */}

                {currentStudy &&
                  <Badge size="2" variant="surface" color={StudyStatusColors[currentStudy?.status]}>
                    {StudyStatusLabels[currentStudy?.status]}
                  </Badge>
                }
              </Card>
            </Tooltip>
          </Flex>

          {/* Спсисок стран исследования */}
          {hierarchyData.studyCountries.length > 0 && currentStudy && currentStudy?.countries?.length > 1 && 
            <Box style={{ flex: 1 }}>
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <GlobeIcon color="var(--accent-9)" />
                <Text weight="bold" size="2">Уровень страны</Text>
              </Flex>
              
              <Separator size="4" />

              <ScrollArea style={{ flex: 1, flexGrow: 1, height: '100%' }}>
                {hierarchyData.studyCountries.length && (
                  <Flex direction="column" gap="2">
                    {hierarchyData.studyCountries
                    .map((country, idx) => (
                      <Tooltip key={idx} content={`Открыть уровень страны (${country.name})`}>
                        <Card 
                          key={idx} 
                          style={{ cursor: 'pointer', maxWidth: '90%' }}
                          variant="classic"
                          onClick={()=>handleStudyMapClick(country.name)}
                        >
                          <Flex 
                            align="center" 
                            gap="2" p="2" 
                            style={{ borderRadius: 'var(--radius-2)'}}
                            key={idx}
                            justify="between"
                          >
                            <Text 
                              size="2" 
                              weight={country.hasSites ? "bold" : "regular"} 
                              style={{ cursor: 'pointer' }}
                            >
                              {country.name}
                            </Text>
                            {country.hasSites && (
                              <Badge size="1" variant="soft" color="green">
                                {country.siteCount} {country.siteCount === 1 ? 'центр' : 'центров'}
                              </Badge>
                            )}
                            {!country.hasSites && (
                              <Badge size="1" variant="soft" color="red">
                                нет центров
                              </Badge>
                            )}
                          </Flex>
                        </Card>   
                      </Tooltip>
                    ))}
                  </Flex>
                )}
              </ScrollArea>
            </Flex>
          </Box>}

          {/* Спсисок центров */}
          <Box style={{ flex: 2, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '270px'   }}>
            <Flex direction="column" gap="2" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <Flex align="center" gap="2">
                <FaRegBuilding color="var(--accent-9)" />
                <Text weight="bold" size="2">Уровень центров</Text>
              </Flex>
              
              <Separator size="4" />
              
              <ScrollArea style={{ flex: 1, flexGrow: 1, height: '100%' }}>
                {hierarchyData.countries.length === 0 ? (
                  <Text size="2" color="gray">Нет доступных центров для отображения</Text>
                ) : (
                  <Flex direction="column" gap="3">
                    {hierarchyData.countries.map((country, idx) => (
                      <Box key={idx}>
                        {/* Узел страны */}
                        <Flex align="center" gap="2" mb="2">
                          <GlobeIcon color="var(--gray-9)" />
                          <Text weight="bold" size="2">{country.name}</Text>
                          <Badge variant="soft" size="1">{country.sites.length} {country.sites.length === 1 ? 'Site' : 'Sites'}</Badge>
                        </Flex>

                        {/* Узлы центров (Sites) */}
                        <Flex direction="column" style={{ marginLeft: '7px', borderLeft: '1px solid var(--gray-5)' }}>
                          {country.sites.map((site) => (
                            <Box 
                              key={site.id}
                              style={{ marginLeft: '12px' }}
                              maxWidth="90%"
                            >
                              <Tooltip content={`Открыть уровень центра (${site.name})`}>
                                <Card 
                                  mb="2" 
                                  variant="classic" 
                                  size="2" 
                                  style={{ 
                                    flex: 1, 
                                    cursor: 'pointer',
                                  }} 
                                  onClick={() => handleStudyMapClick(site)}
                                >
                                  <Flex 
                                    align="start" 
                                    gap="2" 
                                    style={{ 
                                      borderRadius: 'var(--radius-2)',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.2s'
                                    }}
                                    className="site-node-hover"
                                  >
                                    <FaRegBuilding color="var(--gray-8)" style={{ marginTop: '2px' }} />
                                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                                      <Flex align="center" gap="2" wrap="wrap" justify="between">
                                        <Text size="2" weight="bold">{site.name}</Text>
                                        <Badge size="1" color={getStatusColor(site.status)} variant="soft">
                                          {getStatusLabel(site.status)}
                                        </Badge>
                                      </Flex>
                                      <Flex gap="3" wrap="wrap">
                                        {site.city && (
                                          <Text size="1" color="gray">📍 {site.city}</Text>
                                        )}
                                        {site.principal_investigator && (
                                          <Text size="1" color="gray">👨‍⚕️ {site.principal_investigator}</Text>
                                        )}
                                        {site.number && (
                                          <Text size="1" color="gray">#{site.number}</Text>
                                        )}
                                      </Flex>
                                    </Flex>
                                  </Flex>
                                </Card>
                              </Tooltip>
                            </Box>
                          ))}
                        </Flex>
                      </Box>
                    ))}
                  </Flex>
                )}
              </ScrollArea>
            </Flex>
          </Box>
        </Flex>
      </Flex>
    </Card>
  );
};