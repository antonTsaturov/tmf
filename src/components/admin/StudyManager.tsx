import { useState, useCallback, FC, ChangeEvent, KeyboardEvent, useEffect, useContext } from 'react';
import '@/styles/StudyManager.css';
import { Study, StudyStatus } from '@/types/types';
import { deleteRecord } from '@/lib/api/fetch';
import { AdminContext } from '@/wrappers/AdminContext';
import { Tables } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';
import { CountrySelector, SelectorValue } from '@/components/PseudoSelector';
import StatusBadge from './StatusBadge';
import { StructurePreview } from './StructurePreview';
import {
  Card,
  Flex,
  Text,
  Badge,
  Button,
  TextField,
  Separator,
  Heading,
  Box,
  Strong,
  Callout,
  IconButton,
  Dialog,
  ScrollArea
} from '@radix-ui/themes';
import {
  PlusIcon,
  Pencil2Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
  FileTextIcon,
  PersonIcon,
  ArchiveIcon,
  MagnifyingGlassIcon
} from '@radix-ui/react-icons';

export interface StudyItemProps {
  study: Study;
  index: number;
  onUpdate: (id: number, updates: Partial<Study>) => void;
  onDelete: (id: number) => void;
}

// Утилитарные функции
const generateStudyId = (): number => Math.floor(Math.random() * 9000) + 1000;

// Компонент элемента исследования
const StudyItem: FC<StudyItemProps> = ({ study, index, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Study>>({
    title: study.title,
    protocol: study.protocol,
    sponsor: study.sponsor,
    cro: study.cro,
    countries: study.countries
  });

  const handleInputChange = (field: keyof Study) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setEditData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleCountriesChange = (values: SelectorValue[]) => {
    // Приводим к string[]
    const countries = values as string[];
    setEditData(prev => ({
      ...prev,
      countries
    }));
  };

  const handleSave = () => {
    onUpdate(study.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: study.title,
      protocol: study.protocol,
      sponsor: study.sponsor,
      cro: study.cro,
      countries: study.countries
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && isEditing) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Статистика исследования
  const getStudyStats = () => {
    return {
      documents: study.total_documents || 0,
      users: study.users?.length || 0,
    };
  };

  const stats = getStudyStats();

  return (
    <Card variant="surface">
      <Flex direction="column" gap="3" >
        {/* First Row */}
        <Flex align="start" justify="between" gap="4">
          <Flex align="start" gap="3" style={{ flex: 1 }}>
            {/* Index Number */}
            <Flex direction="column" align="center">
              <Flex
                align="center"
                justify="center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent-3)',
                  flexShrink: 0
                }}
              >
                <Text size="2" weight="bold" color="indigo">
                  {index + 1}
                </Text>
              </Flex>
              <Text size="1" color="indigo">
                ID: {study.id}
              </Text>
            </Flex>

            {/* Study Details */}
            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <Flex direction="column" gap="2" >
                  <TextField.Root
                    value={editData.title}
                    onChange={handleInputChange('title')}
                    placeholder="Study Title"
                    autoFocus
                  />
                  <TextField.Root
                    value={editData.protocol}
                    onChange={handleInputChange('protocol')}
                    placeholder="Protocol Number"
                  />
                  <TextField.Root
                    value={editData.sponsor}
                    onChange={handleInputChange('sponsor')}
                    placeholder="Sponsor"
                  />
                  <TextField.Root
                    value={editData.cro}
                    onChange={handleInputChange('cro')}
                    placeholder="CRO Organization"
                  />
                  <Box style={{ marginTop: 8 }}>
                    <CountrySelector
                      selectedValues={editData.countries || study.countries}
                      onChange={handleCountriesChange}
                      placeholder="Select countries..."
                    />
                  </Box>
                </Flex>
              ) : (
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2" wrap="wrap" width="600px">
                    <Text size="2" weight="bold" style={{ wordBreak: 'break-word', maxWidth: '100%' }}>
                      {study.title}
                    </Text>
                    <Badge color="gray" variant="soft" size="1">
                      {study.protocol}
                    </Badge>
                  </Flex>
                  <Flex gap="2" wrap="wrap" direction="column">
                    <Flex gap="1" align="center">
                      <Text size="1" color="gray">Sponsor:</Text>
                      <Text size="1">{study.sponsor}</Text>
                    </Flex>
                    <Flex gap="1" align="center">
                      <Text size="1" color="gray">CRO:</Text>
                      <Text size="1">{study.cro}</Text>
                    </Flex>
                  </Flex>
                  <Flex gap="1" align="center" wrap="wrap">
                    <Text size="1" color="gray">Countries:</Text>
                    <Flex gap="1" wrap="wrap">
                      {study.countries.slice(0, 3).map((country, i) => (
                        <Badge key={i} variant="outline" size="1">
                          {country}
                        </Badge>
                      ))}
                      {study.countries.length > 3 && (
                        <Text size="1" color="gray">
                          +{study.countries.length - 3} more
                        </Text>
                      )}
                    </Flex>
                  </Flex>
                  <Flex gap="2">
                    <Badge color="gray" variant="surface">
                      <Flex gap="1" align="center">
                        <FileTextIcon />
                        <Text size="1">{stats.documents}</Text>
                        <Text size="1" color="gray">Docs</Text>
                      </Flex>
                    </Badge>
                    <Badge color="gray" variant="surface">
                      <Flex gap="1" align="center">
                        <PersonIcon />
                        <Text size="1">{stats.users}</Text>
                        <Text size="1" color="gray">Users</Text>
                      </Flex>
                    </Badge>
                  </Flex>
                </Flex>
              )}
            </Flex>
          </Flex>

          {/* Status */}
          <Flex direction="column" gap="2">
            <Text size="1" weight="medium">
              Change status
            </Text>
            <StatusBadge
              status={study.status}
              onChange={(newStatus) => onUpdate(study.id, { status: newStatus })}
              editable={!isEditing}
            />
          </Flex>
        </Flex>

        {/* Second Row - Actions */}
        <Separator size="4" />
        <Flex justify="end" gap="2">
          {isEditing ? (
            <>
              <Button
                size="2"
                color="green"
                onClick={handleSave}
              >
                <Flex gap="2" align="center">
                  <CheckIcon />
                  Save
                </Flex>
              </Button>
              <Button
                size="2"
                variant="soft"
                color="gray"
                onClick={handleCancel}
              >
                <Flex gap="2" align="center">
                  <Cross2Icon />
                  Cancel
                </Flex>
              </Button>
            </>
          ) : (
            <>
              <Button
                size="2"
                variant="surface"
                onClick={() => setIsEditing(true)}
              >
                <Flex gap="2" align="center">
                  <Pencil2Icon />
                  Edit
                </Flex>
              </Button>
              <Button
                size="2"
                variant="soft"
                color="red"
                onClick={() => onDelete(study.id)}
              >
                <Flex gap="2" align="center">
                  <TrashIcon />
                  Delete
                </Flex>
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

// Основной компонент
const StudyManager: FC = () => {

  const { studies, setStudies, saveStudy } = useContext(AdminContext)!;
  const [studyObject, setStudyObject] = useState<Study[]>([]);
  const [newStudyForm, setNewStudyForm] = useState({
    title: '',
    protocol: '',
    sponsor: '',
    cro: '',
    countries: [] as string[]
  });

  // Добавление исследования 
  const handleAddStudy = useCallback(async () => {
    if (!newStudyForm.title.trim() || !newStudyForm.protocol.trim()) {
      alert('Please fill at least study title and protocol number');
      return;
    }

    const newStudy: Study = {
      id: generateStudyId(),
      title: newStudyForm.title.trim(),
      protocol: newStudyForm.protocol.trim(),
      sponsor: newStudyForm.sponsor.trim() || 'Sponsor TBD',
      cro: newStudyForm.cro.trim() || 'CRO TBD',
      countries: newStudyForm.countries.length > 0 ? newStudyForm.countries : ['Global'],
      status: StudyStatus.PLANNED,
      total_documents: 0,
      folders_structure: null,
      users: null,
    };
    // Write to DB
    const respond = await saveStudy(Tables.STUDY, newStudy);
    if (respond) {
      // Update local state if writing to db was successful
      setStudies(prev => [...prev, newStudy]);
      logger.info('Added new study', { studyId: newStudy.id, protocol: newStudy.protocol });
    }
    
    // Clear form
    setNewStudyForm({ title: '', protocol: '', sponsor: '', cro: '', countries: [] });
  }, [newStudyForm]);

  const handleUpdateStudy = useCallback((id: number, updates: Partial<Study>) => {
    setStudies(prev => {
      // Находим индекс обновляемого исследования
      const studyIndex = prev.findIndex(study => study.id === id);
      
      if (studyIndex === -1) {
        logger.warn(`Study with id ${id} not found in state`);
        return prev;
      }
      
      const currentStudy = prev[studyIndex];
      // Удаляем информацию о центрах из объекта исследования
      const { sites, ...currentStudy_NoSites } = currentStudy;
      
      // Создаем отдельный объект обновленного исследования 
      const updatedStudy: Study = {
        ...currentStudy_NoSites,
        ...updates,
      };
      
        // Сохраняем изменения в БД (асинхронно, не блокируя UI)
      saveStudy(Tables.STUDY, updatedStudy).catch(err => {
        logger.error('Failed to save study updates', err);
      });
      // Создаем копию массива и заменяем элемент
      const newStudies = [...prev];
      newStudies[studyIndex] = updatedStudy;

      return newStudies;
    });
  }, []);

  // Удаление исследования
  const handleDeleteStudy = useCallback((id: number) => {

    if (!window.confirm('Are you sure you want to delete this study? This action cannot be undone.')) {
      return;
    }
    
    deleteRecord(Tables.STUDY, id);
    setStudies(prev => prev.filter(study => study.id !== id));
  }, []);


  // Генерация объекта структуры
  useEffect(() => {
    const generateStudyObject = () => {
      setStudyObject(studies);
      
    }
    generateStudyObject();
  },[studies]);


  // Статистика
  const getStats = () => {
    const stats = {
      total: studies.length,
      planned: studies.filter(s => s.status === StudyStatus.PLANNED).length,
      ongoing: studies.filter(s => s.status === StudyStatus.ONGOING).length,
      completed: studies.filter(s => s.status === StudyStatus.COMPLETED).length,
      terminated: studies.filter(s => s.status === StudyStatus.TERMINATED).length,
      archived: studies.filter(s => s.status === StudyStatus.ARCHIVED).length
    };
    
    return stats;
  };

  const stats = getStats();

  return (
    <Flex direction="column" gap="4" p="4">
      {/* Header */}
      <Card>
        <Flex align="center" justify="between">
          <Heading size="4">Clinical Trials Management</Heading>
        </Flex>
      </Card>

      <Flex gap="4" wrap="wrap">
        {/* Add Study Form */}
        <Card variant="surface" style={{ flex: '1 1 400px', maxWidth: 500 }}>
          <Flex direction="column" gap="3">
            <Heading size="3">
              <Flex gap="2" align="center">
                <PlusIcon />
                Add New Clinical Study
              </Flex>
            </Heading>
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Study Title *</Text>
                <TextField.Root
                  value={newStudyForm.title}
                  onChange={(e) => setNewStudyForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Phase III Oncology Trial"
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Protocol Number *</Text>
                <TextField.Root
                  value={newStudyForm.protocol}
                  onChange={(e) => setNewStudyForm(prev => ({ ...prev, protocol: e.target.value }))}
                  placeholder="e.g., PROT-2024-001"
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Sponsor</Text>
                <TextField.Root
                  value={newStudyForm.sponsor}
                  onChange={(e) => setNewStudyForm(prev => ({ ...prev, sponsor: e.target.value }))}
                  placeholder="Pharmaceutical company"
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">CRO Organization</Text>
                <TextField.Root
                  value={newStudyForm.cro}
                  onChange={(e) => setNewStudyForm(prev => ({ ...prev, cro: e.target.value }))}
                  placeholder="Clinical Research Organization"
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Countries</Text>
                <CountrySelector
                  selectedValues={newStudyForm.countries}
                  onChange={(countries) => setNewStudyForm(prev => ({ ...prev, countries }))}
                  placeholder="Select countries..."
                />
              </Flex>
              <Button
                size="2"
                color="green"
                onClick={handleAddStudy}
                disabled={!newStudyForm.title.trim() || !newStudyForm.protocol.trim()}
              >
                <Flex gap="2" align="center">
                  <PlusIcon />
                  Create Study
                </Flex>
              </Button>
              <Text size="1" color="gray">* Required fields</Text>
            </Flex>
          </Flex>
        </Card>

        {/* Studies List */}
        <Card style={{ flex: '2 1 500px' }}>
          <Flex direction="column" gap="3">
            {/* List Header */}
            <Flex align="center" gap="3" p="2" style={{ borderBottom: '1px solid var(--gray-4)' }}>
              <Box style={{ width: 32, flexShrink: 0 }}>
                <Text size="1" weight="medium" color="gray">#</Text>
              </Box>
              <Box style={{ flex: 1 }}>
                <Text size="1" weight="medium" color="gray">Study Details</Text>
              </Box>
              <Box>
                <Text size="1" weight="medium" color="gray">Status</Text>
              </Box>
            </Flex>

            {studies.length === 0 ? (
              <Flex align="center" justify="center" p="6">
                <Flex direction="column" align="center" gap="3">
                  <ArchiveIcon width="48" height="48" color="var(--gray-8)" />
                  <Heading size="3">No clinical studies yet</Heading>
                  <Text size="2" color="gray">Create your first study using the form above</Text>
                </Flex>
              </Flex>
            ) : (
              <ScrollArea style={{ maxHeight: 600 }}>
                <Flex direction="column" gap="2" p="2">
                  {studies.map((study, index) => (
                    <StudyItem
                      key={study.id}
                      study={study}
                      index={index}
                      onUpdate={handleUpdateStudy}
                      onDelete={handleDeleteStudy}
                    />
                  ))}
                </Flex>
              </ScrollArea>
            )}
          </Flex>
        </Card>
      </Flex>

      {/* Stats Bar */}
      <Card>
        <Flex gap="4" wrap="wrap" justify="center">
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Total Studies:</Text>
            <Text size="2" weight="bold">{stats.total}</Text>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Planned:</Text>
            <Badge color="blue" variant="soft">{stats.planned}</Badge>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Ongoing:</Text>
            <Badge color="green" variant="soft">{stats.ongoing}</Badge>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Completed:</Text>
            <Badge color="gray" variant="soft">{stats.completed}</Badge>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Terminated:</Text>
            <Badge color="red" variant="soft">{stats.terminated}</Badge>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Archived:</Text>
            <Badge color="purple" variant="soft">{stats.archived}</Badge>
          </Flex>
        </Flex>
      </Card>

      {/* Structure Preview */}
      <StructurePreview
        structure={studyObject}
      />
    </Flex>
  );
};

export default StudyManager;