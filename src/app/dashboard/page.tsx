// app/tmf/page.tsx
'use client';

import React, { useState } from 'react';
import {
  Container,
  Flex,
  Box,
  Text,
  Heading,
  Card,
  Button,
  IconButton,
  Badge,
  Avatar,
  TextField,
  DropdownMenu,
  Separator,
  Tooltip,
  ScrollArea,
  Tabs,
  Progress,
  Grid,
  Section,
  Inset,
  Switch,
  Select,
  Popover,
  Table,
  Spinner
} from '@radix-ui/themes';
import {
  FiMenu,
  FiSearch,
  FiBell,
  FiUser,
  FiSettings,
  FiLogOut,
  FiFolder,
  FiFile,
  FiUpload,
  FiDownload,
  FiEye,
  FiEdit,
  FiTrash2,
  FiArchive,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFilter,
  FiChevronDown,
  FiChevronRight,
  FiHome,
  FiBarChart2,
  FiUsers,
  FiHelpCircle,
  FiPlus,
  FiRefreshCw,
  FiStar,
  FiTrendingUp,
  FiCalendar,
  FiPaperclip
} from 'react-icons/fi';

// Типы данных
interface Study {
  id: string;
  name: string;
  protocol: string;
  status: 'active' | 'completed' | 'archived';
  progress: number;
  documentsCount: number;
  lastActivity: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'draft' | 'in_review' | 'approved' | 'archived';
  modified: string;
  size: string;
  studyId: string;
}

interface Folder {
  id: string;
  name: string;
  type: 'zone' | 'artifact' | 'folder';
  documentsCount: number;
  children?: Folder[];
}

const ETMFDashboard: React.FC = () => {
  // Состояния
  const [selectedStudy, setSelectedStudy] = useState<string>('study-1');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  // Моковые данные
  const studies: Study[] = [
    { id: 'study-1', name: 'Исследование ABC-123', protocol: 'PROT-2024-001', status: 'active', progress: 65, documentsCount: 124, lastActivity: '2024-03-15' },
    { id: 'study-2', name: 'Исследование XYZ-456', protocol: 'PROT-2024-002', status: 'active', progress: 32, documentsCount: 67, lastActivity: '2024-03-14' },
    { id: 'study-3', name: 'Исследование DEF-789', protocol: 'PROT-2023-089', status: 'completed', progress: 100, documentsCount: 256, lastActivity: '2024-03-10' },
  ];

  const folders: Folder[] = [
    {
      id: 'zone-1',
      name: 'Administrative',
      type: 'zone',
      documentsCount: 45,
      children: [
        { id: 'artifact-1', name: 'Regulatory', type: 'artifact', documentsCount: 23 },
        { id: 'artifact-2', name: 'Contracts', type: 'artifact', documentsCount: 12 },
        { id: 'artifact-3', name: 'Ethics', type: 'artifact', documentsCount: 10 },
      ]
    },
    {
      id: 'zone-2',
      name: 'Clinical',
      type: 'zone',
      documentsCount: 78,
      children: [
        { id: 'artifact-4', name: 'Protocol', type: 'artifact', documentsCount: 5 },
        { id: 'artifact-5', name: 'CRF', type: 'artifact', documentsCount: 34 },
        { id: 'artifact-6', name: 'SAP', type: 'artifact', documentsCount: 8 },
        { id: 'artifact-7', name: 'CSR', type: 'artifact', documentsCount: 31 },
      ]
    },
    {
      id: 'zone-3',
      name: 'Financial',
      type: 'zone',
      documentsCount: 23,
      children: [
        { id: 'artifact-8', name: 'Invoices', type: 'artifact', documentsCount: 15 },
        { id: 'artifact-9', name: 'Budgets', type: 'artifact', documentsCount: 8 },
      ]
    },
  ];

  const documents: Document[] = [
    { id: 'doc-1', name: 'Clinical Study Protocol v3.2.pdf', type: 'PDF', version: '3.2', status: 'approved', modified: '2024-03-15 14:30', size: '2.4 MB', studyId: 'study-1' },
    { id: 'doc-2', name: 'Informed Consent Form v2.1.docx', type: 'DOCX', version: '2.1', status: 'in_review', modified: '2024-03-15 11:20', size: '1.1 MB', studyId: 'study-1' },
    { id: 'doc-3', name: 'Site Activation Report.pdf', type: 'PDF', version: '1.0', status: 'approved', modified: '2024-03-14 16:45', size: '856 KB', studyId: 'study-1' },
    { id: 'doc-4', name: 'Monitoring Visit Report.xlsx', type: 'XLSX', version: '2.3', status: 'draft', modified: '2024-03-14 09:15', size: '3.2 MB', studyId: 'study-2' },
    { id: 'doc-5', name: 'Safety Data Sheet.pdf', type: 'PDF', version: '1.5', status: 'approved', modified: '2024-03-13 13:40', size: '1.8 MB', studyId: 'study-2' },
    { id: 'doc-6', name: 'Investigator Brochure.pdf', type: 'PDF', version: '4.0', status: 'archived', modified: '2024-03-12 10:30', size: '5.2 MB', studyId: 'study-3' },
  ];

  // Фильтрация документов по исследованию и поиску
  const filteredDocuments = documents.filter(doc => 
    doc.studyId === selectedStudy && 
    (searchQuery === '' || doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Статистика
  const totalDocuments = filteredDocuments.length;
  const approvedCount = filteredDocuments.filter(d => d.status === 'approved').length;
  const inReviewCount = filteredDocuments.filter(d => d.status === 'in_review').length;
  const draftCount = filteredDocuments.filter(d => d.status === 'draft').length;

  // Функции
  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'approved':
        return <Badge color="green">Утвержден</Badge>;
      case 'in_review':
        return <Badge color="blue">На ревью</Badge>;
      case 'draft':
        return <Badge color="gray">Черновик</Badge>;
      case 'archived':
        return <Badge color="amber">Архивирован</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Container size="4" px="4" py="4" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Flex asChild gap="4" align="center" mb="4">
        <header>
          <Flex align="center" gap="2" style={{ flex: 1 }}>
            <IconButton 
              variant="ghost" 
              size="3"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <FiMenu size={20} />
            </IconButton>
            <Heading size="6" style={{ color: 'var(--indigo-9)' }}>
              eTMF
            </Heading>
            <Badge size="2" variant="soft" color="indigo" highContrast>
              Демо версия
            </Badge>
          </Flex>

          <Flex align="center" gap="4">
            {/* Глобальный поиск */}
            <Box style={{ width: '300px' }}>
              <TextField.Root
                placeholder="Поиск документов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="2"
              >
                <TextField.Slot>
                  <FiSearch size={16} />
                </TextField.Slot>
              </TextField.Root>
            </Box>

            {/* Уведомления */}
            <Tooltip content="Уведомления">
              <IconButton variant="ghost" size="2">
                <FiBell size={18} />
              </IconButton>
            </Tooltip>

            {/* Профиль пользователя */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="ghost" size="2">
                  <Avatar
                    size="2"
                    src="https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=256&h=256&q=80&crop=faces&fit=crop"
                    fallback="JD"
                    radius="full"
                  />
                  <Text>John Doe</Text>
                  <FiChevronDown size={14} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item>
                  <FiUser /> Профиль
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                  <FiSettings /> Настройки
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red">
                  <FiLogOut /> Выйти
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </header>
      </Flex>

      {/* Main Content */}
      <Flex gap="4" style={{ flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <Card 
          size="2" 
          style={{ 
            width: sidebarCollapsed ? '60px' : '280px',
            transition: 'width 0.2s',
            overflow: 'hidden'
          }}
        >
          <ScrollArea style={{ height: '100%' }}>
            <Flex direction="column" gap="4" p="3">
              {/* Studies Dropdown */}
              <Box>
                <Text size="1" weight="bold" color="gray" mb="2">
                  ТЕКУЩЕЕ ИССЛЕДОВАНИЕ
                </Text>
                <Select.Root value={selectedStudy} onValueChange={setSelectedStudy}>
                  <Select.Trigger>
                    <Flex align="center" gap="2">
                      <Badge color={studies.find(s => s.id === selectedStudy)?.status === 'active' ? 'green' : 'gray'} size="1" />
                      <Text>{studies.find(s => s.id === selectedStudy)?.name}</Text>
                    </Flex>
                  </Select.Trigger>
                  <Select.Content>
                    {studies.map(study => (
                      <Select.Item key={study.id} value={study.id}>
                        <Flex direction="column">
                          <Text weight="bold">{study.name}</Text>
                          <Text size="1" color="gray">{study.protocol}</Text>
                        </Flex>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>

              {/* Progress */}
              <Box>
                <Flex justify="between" align="center" mb="1">
                  <Text size="1" weight="bold" color="gray">ПРОГРЕСС</Text>
                  <Text size="1" weight="medium">
                    {studies.find(s => s.id === selectedStudy)?.progress}%
                  </Text>
                </Flex>
                <Progress 
                  value={studies.find(s => s.id === selectedStudy)?.progress} 
                  size="1"
                  color="indigo"
                />
              </Box>

              <Separator size="4" />

              {/* Navigation */}
              <Flex direction="column" gap="1">
                <Button variant="ghost" style={{ justifyContent: 'flex-start' }}>
                  <FiHome /> {!sidebarCollapsed && 'Главная'}
                </Button>
                <Button variant="ghost" style={{ justifyContent: 'flex-start' }}>
                  <FiBarChart2 /> {!sidebarCollapsed && 'Аналитика'}
                </Button>
                <Button variant="ghost" style={{ justifyContent: 'flex-start' }}>
                  <FiUsers /> {!sidebarCollapsed && 'Пользователи'}
                </Button>
                <Button variant="ghost" style={{ justifyContent: 'flex-start' }}>
                  <FiHelpCircle /> {!sidebarCollapsed && 'Помощь'}
                </Button>
              </Flex>

              <Separator size="4" />

              {/* TMF Structure */}
              <Box>
                <Flex justify="between" align="center" mb="2">
                  <Text size="1" weight="bold" color="gray">СТРУКТУРА TMF</Text>
                  <IconButton variant="ghost" size="1">
                    <FiPlus size={14} />
                  </IconButton>
                </Flex>

                <Flex direction="column" gap="1">
                  {folders.map(folder => (
                    <Box key={folder.id}>
                      <Button
                        variant={selectedFolder === folder.id ? 'soft' : 'ghost'}
                        style={{ justifyContent: 'flex-start', width: '100%' }}
                        onClick={() => setSelectedFolder(folder.id)}
                      >
                        <Flex align="center" gap="2" style={{ width: '100%' }}>
                          <FiFolder color="var(--amber-9)" />
                          {!sidebarCollapsed && (
                            <>
                              <Text size="2" style={{ flex: 1, textAlign: 'left' }}>
                                {folder.name}
                              </Text>
                              <Badge size="1" variant="soft">
                                {folder.documentsCount}
                              </Badge>
                            </>
                          )}
                        </Flex>
                      </Button>

                      {!sidebarCollapsed && folder.children && (
                        <Flex direction="column" ml="4" mt="1">
                          {folder.children.map(child => (
                            <Button
                              key={child.id}
                              variant="ghost"
                              size="1"
                              style={{ justifyContent: 'flex-start' }}
                              onClick={() => setSelectedFolder(child.id)}
                            >
                              <Flex align="center" gap="2" style={{ width: '100%' }}>
                                <FiFolder color="var(--blue-9)" />
                                <Text size="2" style={{ flex: 1, textAlign: 'left' }}>
                                  {child.name}
                                </Text>
                                <Badge size="1" variant="soft">
                                  {child.documentsCount}
                                </Badge>
                              </Flex>
                            </Button>
                          ))}
                        </Flex>
                      )}
                    </Box>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </ScrollArea>
        </Card>

        {/* Main Area */}
        <Flex direction="column" gap="4" style={{ flex: 1, minWidth: 0 }}>
          {/* Stats Cards */}
          <Grid columns="4" gap="3">
            <Card size="1">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">Всего документов</Text>
                <Heading size="5">{totalDocuments}</Heading>
                <Text size="1" color="green">+12% за месяц</Text>
              </Flex>
            </Card>
            <Card size="1">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">Утверждено</Text>
                <Heading size="5" color="green">{approvedCount}</Heading>
                <Progress value={approvedCount / totalDocuments * 100} size="1" color="green" />
              </Flex>
            </Card>
            <Card size="1">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">На ревью</Text>
                <Heading size="5" color="blue">{inReviewCount}</Heading>
                <Progress value={inReviewCount / totalDocuments * 100} size="1" color="blue" />
              </Flex>
            </Card>
            <Card size="1">
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">Черновики</Text>
                <Heading size="5" color="gray">{draftCount}</Heading>
                <Progress value={draftCount / totalDocuments * 100} size="1" color="gray" />
              </Flex>
            </Card>
          </Grid>

          {/* Actions Bar */}
          <Card size="1">
            <Flex justify="between" align="center" p="2">
              <Flex gap="2" align="center">
                <Button size="2" color="indigo">
                  <FiUpload /> Загрузить
                </Button>
                <Button size="2" variant="soft" disabled={selectedDocuments.length === 0}>
                  <FiDownload /> Скачать ({selectedDocuments.length})
                </Button>
                <Button size="2" variant="soft" color="red" disabled={selectedDocuments.length === 0}>
                  <FiTrash2 /> Удалить
                </Button>
                <Separator orientation="vertical" size="2" />
                <IconButton variant="ghost" size="2">
                  <FiRefreshCw />
                </IconButton>
              </Flex>

              <Flex gap="2" align="center">
                <Popover.Root>
                  <Popover.Trigger>
                    <Button variant="soft" size="2">
                      <FiFilter /> Фильтры <FiChevronDown />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content>
                    <Flex direction="column" gap="2" style={{ width: '250px' }}>
                      <Text size="2" weight="bold">Фильтры</Text>
                      <Select.Root defaultValue="all">
                        <Select.Trigger placeholder="Статус" />
                        <Select.Content>
                          <Select.Item value="all">Все статусы</Select.Item>
                          <Select.Item value="approved">Утвержденные</Select.Item>
                          <Select.Item value="in_review">На ревью</Select.Item>
                          <Select.Item value="draft">Черновики</Select.Item>
                        </Select.Content>
                      </Select.Root>
                      <TextField.Root placeholder="Тип документа" />
                      <Flex gap="2" justify="end">
                        <Button size="1" variant="soft">Сбросить</Button>
                        <Button size="1">Применить</Button>
                      </Flex>
                    </Flex>
                  </Popover.Content>
                </Popover.Root>

                <Flex gap="1">
                  <Tooltip content="Сетка">
                    <IconButton 
                      variant={viewMode === 'grid' ? 'solid' : 'ghost'} 
                      size="2"
                      onClick={() => setViewMode('grid')}
                    >
                      <FiFile />
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Список">
                    <IconButton 
                      variant={viewMode === 'list' ? 'solid' : 'ghost'} 
                      size="2"
                      onClick={() => setViewMode('list')}
                    >
                      <FiMenu />
                    </IconButton>
                  </Tooltip>
                </Flex>
              </Flex>
            </Flex>
          </Card>

          {/* Documents Area */}
          <Card size="2" style={{ flex: 1, overflow: 'hidden' }}>
            <ScrollArea style={{ height: '100%' }}>
              {viewMode === 'list' ? (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                          onChange={() => {
                            if (selectedDocuments.length === filteredDocuments.length) {
                              setSelectedDocuments([]);
                            } else {
                              setSelectedDocuments(filteredDocuments.map(d => d.id));
                            }
                          }}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Название</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Тип</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Версия</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Статус</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Изменен</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Размер</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell align="center">Действия</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>

                  <Table.Body>
                    {filteredDocuments.map((doc) => (
                      <Table.Row key={doc.id} style={{ cursor: 'pointer' }}>
                        <Table.Cell>
                          <input 
                            type="checkbox" 
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <Flex align="center" gap="2">
                            <FiFile color="var(--blue-9)" />
                            <Text size="2" weight="medium">{doc.name}</Text>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge size="1" variant="soft" color="blue">
                            {doc.type}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">v{doc.version}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          {getStatusBadge(doc.status)}
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">{doc.modified}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2">{doc.size}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex gap="2" justify="center">
                            <Tooltip content="Просмотр">
                              <IconButton size="1" variant="ghost">
                                <FiEye size={14} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip content="Редактировать">
                              <IconButton size="1" variant="ghost">
                                <FiEdit size={14} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip content="Скачать">
                              <IconButton size="1" variant="ghost">
                                <FiDownload size={14} />
                              </IconButton>
                            </Tooltip>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              ) : (
                <Grid columns="4" gap="3" p="3">
                  {filteredDocuments.map((doc) => (
                    <Card key={doc.id} size="1">
                      <Flex direction="column" gap="2">
                        <Flex justify="between" align="start">
                          <Box p="2" style={{ backgroundColor: 'var(--blue-3)', borderRadius: 'var(--radius-2)' }}>
                            <FiFile size={24} color="var(--blue-9)" />
                          </Box>
                          <input 
                            type="checkbox" 
                            checked={selectedDocuments.includes(doc.id)}
                            onChange={() => toggleDocumentSelection(doc.id)}
                          />
                        </Flex>
                        <Box>
                          <Text size="2" weight="bold" style={{ wordBreak: 'break-word' }}>
                            {doc.name}
                          </Text>
                          <Flex gap="1" mt="1">
                            <Badge size="1" variant="soft" color="blue">
                              {doc.type}
                            </Badge>
                            <Badge size="1" variant="soft" color="gray">
                              v{doc.version}
                            </Badge>
                          </Flex>
                        </Box>
                        <Flex justify="between" align="center">
                          {getStatusBadge(doc.status)}
                          <Text size="1" color="gray">{doc.modified}</Text>
                        </Flex>
                        <Separator size="4" />
                        <Flex gap="2" justify="end">
                          <IconButton size="1" variant="ghost">
                            <FiEye size={14} />
                          </IconButton>
                          <IconButton size="1" variant="ghost">
                            <FiEdit size={14} />
                          </IconButton>
                          <IconButton size="1" variant="ghost">
                            <FiDownload size={14} />
                          </IconButton>
                        </Flex>
                      </Flex>
                    </Card>
                  ))}
                </Grid>
              )}
            </ScrollArea>
          </Card>

          {/* Footer */}
          <Flex justify="between" align="center" px="2">
            <Text size="1" color="gray">
              Показано {filteredDocuments.length} из {documents.filter(d => d.studyId === selectedStudy).length} документов
            </Text>
            <Flex gap="2">
              <Button variant="soft" size="1" disabled>Предыдущая</Button>
              <Button variant="soft" size="1">Следующая</Button>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Container>
  );
};

export default ETMFDashboard;