// src/components/ui/WelcomeScreen.tsx

import { Button, Card, Flex, Heading, Text, DropdownMenu, Spinner } from '@radix-ui/themes';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useContext } from 'react';
import { MainContext } from '@/wrappers/MainContext';
import { AdminContext } from '@/wrappers/AdminContext';
import { useAuth } from '@/wrappers/AuthProvider';
import { useStudyChange } from '@/hooks/useStudyChange';

export const RECENT_STUDIES = [
  { id: '1', name: 'Trial-A-2023', phase: 'Phase III' },
  { id: '2', name: 'Project-Beta-456', phase: 'Phase I' },
  { id: '3', name: 'Study-Gamma-Phase3', phase: 'Phase II' },
];

export const WelcomeScreen = () => {
  const { updateContext } = useContext(MainContext)!;
  const { studies, loading } = useContext(AdminContext)!;
  const { user } = useAuth();
  console.log(studies);

  const { handleStudyChange } = useStudyChange({
    studies,
    updateContext,
  });
    
  return (
    <Flex direction="column" align="center" justify="center" style={{ height: '100%', gap: '32px' }}>
      
      {/* Центральная карточка */}
      <Card size="3" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <Flex direction="column" align="center" gap="4">
          
          <Heading size="6" mb="1">Начните работу c ExploeTMF</Heading>
          
          <Text color="gray" size="2" mb="4">
            Чтобы просмотреть документы, пожалуйста, выберите исследование в меню сверху или нажмите кнопку ниже.
          </Text>

          {!loading ? <DropdownMenu.Root>
            <DropdownMenu.Trigger style={{outline: 'none'}}>
              <Button size="3" variant="solid" style={{ width: '270px', cursor: 'pointer' }}>
                ВЫБРАТЬ ИССЛЕДОВАНИЕ
                <ChevronDownIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content style={{ width: '270px', cursor: 'pointer'}} >
              {studies
                .filter(study => user?.assigned_study_id?.includes(study.id))
                .map((study) => (
                  <DropdownMenu.Item
                    key={study.id}
                    onClick={() => handleStudyChange(String(study.id))}
                   >
                    {study.protocol}
                  </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>  
          : (
            <Flex
              style={{ 
                width: '270px',
                textAlign: 'center', 
                justifyContent: 'center' , 
                alignItems: 'center',
                height: '40px'
              }}
            >  
              <Spinner title='Загрузка...'/>
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Секция Lightweight History */}
      {/* <Box style={{ width: '100%', maxWidth: '800px' }}>
        <Flex align="center" gap="2" mb="3" >
          <ClockIcon />
          <Text size="2" weight="bold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Недавние исследования
          </Text>
        </Flex>
        
        <Grid columns="3" gap="3" width="auto">
          {RECENT_STUDIES.map((study) => (
            <Card 
              key={study.id} 
              asChild 
              style={{ cursor: 'pointer' }}
              //onClick={() => updateContext({ currentStudy: study.id })} 
            >
              <a href="#">
                <Text as="div" size="2" weight="bold" mb="1">Продолжить с:</Text>
                <Text as="div" size="3" color="blue">{study.name}</Text>
                <Text as="div" size="1" color="gray">{study.phase}</Text>
              </a>
            </Card>
          ))}
        </Grid>
      </Box> */}
    </Flex>
  );
};