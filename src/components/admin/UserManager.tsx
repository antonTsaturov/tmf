// src/components/admin/UserManager.tsx
'use client'
import { useState, useCallback, FC, ChangeEvent, useEffect, useContext } from 'react';
import {
  Box,
  Flex,
  Text,
  Heading,
  Button,
  TextField,
  Select,
  Badge,
  Card,
  Separator,
  Dialog,
  DropdownMenu,
  Tooltip,
  Strong,
  ScrollArea,
} from '@radix-ui/themes';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiUsers,
  FiRefreshCw,
} from 'react-icons/fi';
import { AdminContext } from '@/wrappers/AdminContext';
import { StudyUser, OrganisationType, UserRole, UserStatus, UserPermissions, StudySite, Study, ROLE_CONFIG as roleConfig } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from './StructurePreview';
import { useEntityState } from '@/hooks/useEntityState';
import { useNotification } from '@/wrappers/NotificationContext';
import { RoleSelector, SelectorValue, SiteSelector, StudySelector } from '../PseudoSelector';
import { deleteRecord } from '@/lib/api/fetch';
import { getPermissionsForRole} from '@/lib/auth/permissions';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';

// Пропсы компонентов
interface StatusBadgeProps {
  status: UserStatus;
  onChange?: (status: UserStatus) => void;
  editable?: boolean;
}

interface UserItemProps {
  user: StudyUser;
  sites: StudySite[];
  studies: Study[];
  index: number;
  onUpdate: (id: StudyUser['id'], updates: Partial<StudyUser>) => void;
  onDelete: (id: StudyUser['id']) => void;
}

interface UserManagerProps {
  initialUsers?: StudyUser[];
}

// Компонент бейджа статуса
const StatusBadge: FC<StatusBadgeProps> = ({ status, onChange, editable = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusConfig = {
    [UserStatus.ACTIVE]: { label: 'Active', color: 'green', icon: '🟢' },
    [UserStatus.INACTIVE]: { label: 'Inactive', color: 'gray', icon: '⚪' },
    [UserStatus.PENDING]: { label: 'Pending', color: 'orange', icon: '🟡' },
    [UserStatus.TERMINATED]: { label: 'Terminated', color: 'red', icon: '🔴' },
  };

  const config = statusConfig[status];

  const handleStatusChange = (newStatus: UserStatus) => {
    if (onChange) {
      onChange(newStatus);
      setIsOpen(false);
    }
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger>
        <Badge
          size="2"
          color={config.color as any}
          style={{ cursor: editable ? 'pointer' : 'default' }}
        >
          {config.icon} {config.label}
        </Badge>
      </DropdownMenu.Trigger>
      {editable && (
        <DropdownMenu.Content>
          {Object.entries(statusConfig).map(([statusKey, cfg]) => (
            <DropdownMenu.Item
              key={statusKey}
              onClick={() => handleStatusChange(statusKey as UserStatus)}
            >
              {cfg.icon} {cfg.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      )}
    </DropdownMenu.Root>
  );
};

// Компонент бейджа роли
const RoleBadge: FC<{ role: UserRole }> = ({ role }) => {
  const config = roleConfig[role];

  return (
    <Badge size="1" variant="soft" color={config.color as any}>
      {config.label}
    </Badge>
  );
};

// Компонент элемента пользователя
const UserItem: FC<UserItemProps> = ({ user, sites, studies, index, onUpdate, onDelete }) => {

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<StudyUser>>({
    name: user.name,
    email: user.email,
    title: user.title,
    organisation: user.organisation,
    status: user.status,
    role: user.role,
    assigned_site_id: user.assigned_site_id,
    assigned_study_id: user.assigned_study_id
  });

  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(user.role || []);

  const handleInputChange = (field: keyof StudyUser) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setEditData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // const handleSelectChange = (field: keyof StudyUser) => (
  //   e: ChangeEvent<HTMLSelectElement>
  // ) => {
  //   setEditData(prev => ({
  //     ...prev,
  //     [field]: e.target.value
  //   }));
  // };

  const handleSave = () => {
    if (!editData.email || !editData.email.trim() || !editData.name || !editData.name.trim()) {
      alert('Email and Name are required fields.');
      return;
    }

    const updates: Partial<StudyUser> = {
      ...editData,
      role: selectedRoles
    };

    onUpdate(user.id, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: user.name,
      email: user.email,
      title: user.title,
      organisation: user.organisation,
      status: user.status,
      role: user.role,
      assigned_site_id: user.assigned_site_id,
      assigned_study_id: user.assigned_study_id
    });
    setSelectedRoles(user.role || []);
    setIsEditing(false);
  };

  // const handleKeyDown = (e: KeyboardEvent) => {
  //   if (e.key === 'Enter' && isEditing) {
  //     handleSave();
  //   } else if (e.key === 'Escape') {
  //     handleCancel();
  //   }
  // };

  const handleRolesChange = (role: SelectorValue[]) => {
    const userRole = role as UserRole[];
    setEditData(prev => ({
      ...prev,
      role: userRole
    }));
  };

  const handleSitesChange = (siteID: number[]) => {
    setEditData(prev => ({
      ...prev,
      assigned_site_id: siteID
    }));
  };

  const handleStudyChange = (studyID: number[]) => {
    setEditData(prev => ({
      ...prev,
      assigned_study_id: studyID
    }));
  };


  return (
    <Card variant="surface">
      <Flex direction="column" gap="3">
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
            </Flex>

            {/* User Details */}
            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
              {isEditing ? (
                <Flex direction="column" gap="2">
                  <TextField.Root
                    value={editData.name}
                    onChange={handleInputChange('name')}
                    placeholder="Full name *"
                    autoFocus
                  />
                  <TextField.Root
                    type="email"
                    value={editData.email}
                    onChange={handleInputChange('email')}
                    placeholder="Email *"
                  />
                  <TextField.Root
                    value={editData.title}
                    onChange={handleInputChange('title')}
                    placeholder="Job Title"
                  />
                  <Select.Root
                    value={editData.organisation}
                    onValueChange={(value) => setEditData(prev => ({
                      ...prev,
                      organisation: value as OrganisationType
                    }))}
                  >
                    <Select.Trigger placeholder="Select organisation" />
                    <Select.Content>
                      <Select.Item value="CRO">CRO</Select.Item>
                      <Select.Item value="SPONSOR">Sponsor</Select.Item>
                      <Select.Item value="SITE">Site</Select.Item>
                    </Select.Content>
                  </Select.Root>
                  <RoleSelector
                    selectedValues={editData.role as UserRole[]}
                    onChange={handleRolesChange}
                    placeholder="Select user roles..."
                    disabled={false}
                  />
                  <SiteSelector
                    user={user}
                    availableOptions={sites}
                    selectedValues={editData.assigned_site_id as number[]}
                    onChange={handleSitesChange}
                    placeholder="Select sites..."
                    disabled={false}
                    showSiteDetails={true}
                  />
                  <StudySelector
                    user={user}
                    availableOptions={studies}
                    selectedValues={editData.assigned_study_id as number[]}
                    onChange={handleStudyChange}
                    placeholder="Select studies..."
                    disabled={false}
                  />
                </Flex>
              ) : (
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2" wrap="wrap">
                    <Text size="2" weight="bold" style={{ wordBreak: 'break-word', maxWidth: '100%' }}>
                      {user.name}
                    </Text>
                    <Badge color="gray" variant="soft" size="1">
                      {user.email}
                    </Badge>
                  </Flex>
                  <Flex gap="2" wrap="wrap" direction="column">
                    {user.title && (
                      <Flex gap="1" align="center">
                        <Text size="1" color="gray">Title:</Text>
                        <Text size="1">{user.title}</Text>
                      </Flex>
                    )}
                    <Flex gap="1" align="center">
                      <Text size="1" color="gray">Organisation:</Text>
                      <Text size="1">{user.organisation}</Text>
                    </Flex>
                  </Flex>
                  <Flex gap="1" align="center" wrap="wrap">
                    <Text size="1" color="gray">Roles:</Text>
                    <Flex gap="1" wrap="wrap">
                      {user.role.map(role => (
                        <RoleBadge key={role} role={role} />
                      ))}
                    </Flex>
                  </Flex>
                  {user.assigned_study_id.length > 0 && (
                    <Flex gap="2">
                      <Tooltip content={
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {studies
                            .filter(study => user.assigned_study_id.includes(Number(study.id)))
                            .map(study => (
                              <Text key={study.id} size="1">{study.protocol}</Text>
                            ))
                          }
                        </span>
                      }>
                        <Badge color="gray" variant="surface" style={{ cursor: 'pointer' }}>
                          <Flex gap="1" align="center">
                            <Text size="1">{user.assigned_study_id.length}</Text>
                            <Text size="1" color="gray">Studies</Text>
                          </Flex>
                        </Badge>
                      </Tooltip>
                      <Tooltip content={
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {sites
                            .filter(site => user.assigned_site_id.includes(Number(site.id)))
                            .map(site => (
                              <Text key={site.id} size="1">{site.name}</Text>
                            ))
                          }
                        </span>
                      }>
                        <Badge color="gray" variant="surface" style={{ cursor: 'pointer' }}>
                          <Flex gap="1" align="center">
                            <Text size="1">{user.assigned_site_id.length}</Text>
                            <Text size="1" color="gray">Sites</Text>
                          </Flex>
                        </Badge>
                      </Tooltip>
                    </Flex>
                  )}
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
              status={user.status}
              onChange={(newStatus) => onUpdate(user.id, { status: newStatus })}
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
                  <FiCheck />
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
                  <FiX />
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
                  <FiEdit2 />
                  Edit
                </Flex>
              </Button>
              <Button
                size="2"
                variant="soft"
                color="red"
                onClick={() => onDelete(user.id)}
              >
                <Flex gap="2" align="center">
                  <FiTrash2 />
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
const UserManager: FC<UserManagerProps> = () => {
  const { studies, saveUser, loadTable, loadTablePartial, loadAllUsers } = useContext(AdminContext)!;
  const { addNotification } = useNotification();

  const [sites, setSites] = useState<StudySite[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<StudyUser | null>(null);
  const [filterSite, setFilterSite] = useState<number | null>(null);
  const [filterStudy, setFilterStudy] = useState<number | null>(null);
  
  const { 
    entities: managedUsers, 
    updateEntity: updateUser,
    addEntity: addUser,
    removeEntity: removeUser,
    setEntities: setManagedUsers
  } = useEntityState<StudyUser>([], async (user) => {
    // Функция сохранения в БД
    await saveUser(Tables.USERS, user);
  });
  
  interface NewUserFormData {
    name: string;
    email: string;
    title: string;
    organisation: OrganisationType;
    roles: UserRole[];
    assigned_site_id: number[]; // Только ID
    assigned_study_id: number[],
    permissions: UserPermissions | undefined;
  }  

  const [newUserForm, setNewUserForm] = useState<NewUserFormData>({
    name: '',
    email: '',
    title: '',
    organisation: 'CRO' as OrganisationType,
    roles: [],
    assigned_site_id: [],
    assigned_study_id: [],
    permissions: undefined
  });


  // Эффект для обновления permissions при изменении roles
  useEffect(() => {
    if (newUserForm.roles.length > 0) {
      const newPermissions = getPermissionsForRole(newUserForm.roles);
      setNewUserForm(prev => ({
        ...prev,
        permissions: newPermissions
      }));
    } else {
      // Если ролей нет, очищаем permissions
      setNewUserForm(prev => ({
        ...prev,
        permissions: undefined
      }));
    }
  }, [newUserForm.roles]);
    
  // Добавление нового пользователя
  const handleAddUser = useCallback( async () => {
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      addNotification('info', 'Please fill all required fields: Name and Email.');
      return;
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserForm.email)) {
      addNotification('info', 'Please enter a valid email address.');
      return;
    }


    const newUser: StudyUser = {
      id: `${uuidv4()}`,
      email: newUserForm.email.trim(),
      name: newUserForm.name.trim(),
      title: newUserForm.title.trim(),
      organisation: newUserForm.organisation,
      role: newUserForm.roles,
      status: UserStatus.PENDING,
      password_hash: '', // Будет установлен при активации
      permissions: getPermissionsForRole(newUserForm.roles),
      assigned_study_id: newUserForm.assigned_study_id,
      assigned_site_id: newUserForm.assigned_site_id,
      email_notifications_enabled: true,
      failed_login_attempts: 0,
      created_at: new Date().toISOString()
    };

    try {
      const response = await saveUser(Tables.USERS, newUser);
      if (response) {
        addNotification('success', `User ${newUser.name} has been created successfully. Welcome email sent to ${newUser.email}.`);
        setNewUserForm({
          name: '',
          email: '',
          title: '',
          organisation: 'CRO',
          roles: [],
          assigned_site_id: [],
          assigned_study_id: [],
          permissions: undefined
        });
        loadUsers();
      } else {
        addNotification('error', 'Failed to save user to database.');
      }
    } catch (err) {
      addNotification('error', 'An error occurred while creating the user.', err);
    }

  }, [newUserForm, addUser, addNotification]);

  // Обновление пользователя
  const handleUpdateUser = useCallback((id: StudyUser['id'], updates: Partial<StudyUser>) => {
    updateUser(id, updates);
  }, [updateUser]);

  // Удаление пользователя
  const handleDeleteUser = useCallback((id: StudyUser['id']) => {
    const user = managedUsers.find(u => u.id === id);
    setUserToDelete(user || null);
    setDeleteConfirmOpen(true);
  }, [managedUsers]);

  const confirmDeleteUser = useCallback(async () => {
    if (!userToDelete) return;

    try {
      const response = await deleteRecord(Tables.USERS, userToDelete.id);
      if (response) {
        removeUser(userToDelete.id);
        addNotification('success', `User ${userToDelete.name} has been deleted successfully.`);
      } else {
        addNotification('error', 'Failed to delete user from database.');
      }
    } catch (err) {
      addNotification('error', 'An error occurred while deleting the user.', err);
    } finally {
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    }
  }, [userToDelete, removeUser, addNotification]);

  const [userObject, setUserObject] = useState<any>([]);
  // Генерация объекта структуры
  useEffect(() => {

    if ( managedUsers.length < 1) {
      setUserObject([]);
      return;
    }
    const generateUserObject = () => {

      const allData = {...managedUsers, ...newUserForm};
      setUserObject(allData);
    };
    generateUserObject();
  }, [newUserForm, managedUsers, loadTablePartial]);

  // Функция для загрузки списка пользователей
  // Вынесена отдельно, так как используется повторно после добавления нового пользователя
  const loadUsers = async () => {
    try {
      const loadedUsers = await loadAllUsers();
      const studyUsers = loadedUsers as unknown as StudyUser[];
      logger.info('Users loaded', { count: studyUsers?.length });
      if (studyUsers ) {
        setManagedUsers(studyUsers);
      } else {
        setManagedUsers([]);
      }
    } catch (err) {
      logger.error('Error loading users', err);
      addNotification('error', 'Failed to load users from database.');
      setManagedUsers([]);
    }
  };

  // Загрузка пользователей и центров
  useEffect(() => {
    const loadSites = async () => {
      try {
        const loadedSites = await loadTable(Tables.SITE);
        const userSites = loadedSites as unknown as StudySite[]
        logger.info('Sites loaded', { count: userSites?.length });
        if (userSites ) {
          setSites(userSites);
        } else {
          setSites([]);
        }
      } catch (error) {
        logger.error('Error loading sites', error);
        setSites([]);
      }
    };

    loadUsers();
    loadSites();
    
  }, [loadTablePartial, setManagedUsers ]);


  // Тоггл роли в форме добавления
  const handleRolesChange = (roles: SelectorValue[]) => {
    const userRoles = roles as UserRole[];
    setNewUserForm(prev => ({
      ...prev,
      roles: userRoles
    }));
  };

  const handleSitesChange = (siteID: number[]) => {
    //const userRoles = roles as UserRole[];
    setNewUserForm(prev => ({
      ...prev,
      assigned_site_id: siteID
    }));
  };

  const handleStudyChange = (studyID: number[]) => {
    //const userRoles = roles as UserRole[];
    setNewUserForm(prev => ({
      ...prev,
      assigned_study_id: studyID
    }));
  };

  // Сброс
  const handleReset = () => {
    if (window.confirm('Clear all users? This will only clear the local view.')) {
      setManagedUsers([]);
      setUserObject([]);
    }
  };

  // Статистика
  const getStats = () => {
    const stats = {
      total: managedUsers?.length || 0,
      active: managedUsers?.filter(u => u.status === UserStatus.ACTIVE).length || 0,
      inactive: managedUsers?.filter(u => u.status === UserStatus.INACTIVE).length || 0,
      pending: managedUsers?.filter(u => u.status === UserStatus.PENDING).length || 0,
      terminated: managedUsers?.filter(u => u.status === UserStatus.TERMINATED).length || 0,
    };
    
    return stats;
  };

  const stats = getStats();

  // Filter users based on selected site and study
  const filteredUsers = managedUsers?.filter(user => {
    const matchesSite = filterSite === null || user.assigned_site_id.includes(filterSite);
    const matchesStudy = filterStudy === null || user.assigned_study_id.includes(filterStudy);
    return matchesSite && matchesStudy;
  });


  return (
    <Flex direction="column" gap="4" p="4">
      {/* Header */}
      <Card>
        <Flex align="center" justify="between">
          <Heading size="4">
            <FiUsers style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Users Management
          </Heading>
          <Button
            variant="soft"
            color="gray"
            onClick={handleReset}
          >
            <FiRefreshCw /> Reset View
          </Button>
        </Flex>
      </Card>

      <Flex gap="4" wrap="wrap">
        {/* Add User Form */}
        <Card variant="surface" style={{ flex: '1 1 400px', maxWidth: 500 }}>
          <Flex direction="column" gap="3">
            <Heading size="3">
              <Flex gap="2" align="center">
                <FiPlus />
                Add New User
              </Flex>
            </Heading>
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Full Name *</Text>
                <TextField.Root
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Email *</Text>
                <TextField.Root
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Job Title *</Text>
                <TextField.Root
                  value={newUserForm.title}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Clinical Research Associate"
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Organisation *</Text>
                <Select.Root
                  value={newUserForm.organisation}
                  onValueChange={(value) => setNewUserForm(prev => ({
                    ...prev,
                    organisation: value as OrganisationType
                  }))}
                >
                  <Select.Trigger placeholder="Select organisation" />
                  <Select.Content>
                    <Select.Item value="CRO">CRO</Select.Item>
                    <Select.Item value="SPONSOR">Sponsor</Select.Item>
                    <Select.Item value="SITE">Site</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Role *</Text>
                <RoleSelector
                  selectedValues={newUserForm.roles}
                  onChange={handleRolesChange}
                  placeholder="Select user roles..."
                  disabled={false}
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Assigned Study</Text>
                <StudySelector
                  availableOptions={studies}
                  selectedValues={newUserForm.assigned_study_id}
                  onChange={handleStudyChange}
                  placeholder="Select studies..."
                  disabled={false}
                />
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Assigned Sites</Text>
                <SiteSelector
                  availableOptions={sites}
                  selectedValues={newUserForm.assigned_site_id}
                  onChange={handleSitesChange}
                  placeholder="Select assigned sites..."
                  disabled={false}
                />
              </Flex>
              <Button
                size="2"
                color="green"
                onClick={handleAddUser}
                disabled={
                  !newUserForm.name.trim()
                  || !newUserForm.email.trim()
                  || !newUserForm.title.trim()
                  || !newUserForm.organisation.trim()
                  || newUserForm.roles.length < 1
                }
              >
                <Flex gap="2" align="center">
                  <FiPlus />
                  Add User
                </Flex>
              </Button>
              <Text size="1" color="gray">* Required fields</Text>
            </Flex>
          </Flex>
        </Card>

        {/* Users List */}
        <Card style={{ flex: '2 1 500px' }}>
          <Flex direction="column" gap="3">
            {/* Filters */}
            <Flex gap="3" align="end" p="2" style={{ borderBottom: '1px solid var(--gray-4)' }}>
              <Box style={{ flex: 1 }}>
                <Text size="1" weight="medium" mb="1">Filter by Study</Text>
                <Select.Root
                  value={filterStudy?.toString() || 'all'}
                  onValueChange={(value) => {
                    const studyValue = value === 'all' ? null : Number(value);
                    setFilterStudy(studyValue);
                    // Reset site filter when study changes
                    setFilterSite(null);
                  }}
                >
                  <Select.Trigger placeholder="All studies" style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="all">All studies</Select.Item>
                    {studies.map(study => (
                      <Select.Item key={study.id} value={study.id.toString()}>
                        {study.protocol}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>


              <Box style={{ flex: 1 }}>
                <Text size="1" weight="medium" mb="1">Filter by Site</Text>
                <Select.Root
                  value={filterSite?.toString() || 'all'}
                  onValueChange={(value) => setFilterSite(value === 'all' ? null : Number(value))}
                >
                  <Select.Trigger placeholder="All sites" style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="all">All sites</Select.Item>
                    {sites
                      .filter(site => filterStudy === null || site.study_id === filterStudy)
                      .map(site => (
                        <Select.Item key={site.id} value={site.id.toString()}>
                          {site.name}
                        </Select.Item>
                      ))
                    }
                  </Select.Content>
                </Select.Root>
              </Box>


            </Flex>

            {/* List Header */}
            <Flex align="center" gap="3" p="2" style={{ borderBottom: '1px solid var(--gray-4)' }}>
              <Box style={{ width: 32, flexShrink: 0 }}>
                <Text size="1" weight="medium" color="gray">#</Text>
              </Box>
              <Box style={{ flex: 1 }}>
                <Text size="1" weight="medium" color="gray">User Details</Text>
              </Box>
              <Box>
                <Text size="1" weight="medium" color="gray">Status</Text>
              </Box>
              <Box style={{ width: 120 }}>
                <Text size="1" weight="medium" color="gray">Actions</Text>
              </Box>
            </Flex>

            {filteredUsers?.length === 0 ? (
              <Flex align="center" justify="center" p="6">
                <Flex direction="column" align="center" gap="3">
                  <FiUsers size={48} color="var(--gray-8)" />
                  <Heading size="3">
                    {managedUsers?.length === 0 ? 'No users yet' : 'No users match filters'}
                  </Heading>
                  <Text size="2" color="gray">
                    {managedUsers?.length === 0 
                      ? 'Add your first user using the form above'
                      : 'Try adjusting the filters'}
                  </Text>
                </Flex>
              </Flex>
            ) : (
              <ScrollArea style={{ maxHeight: 600 }}>
                <Flex direction="column" gap="2" p="2">
                  {filteredUsers?.map((user, index) => (
                    <UserItem
                      sites={sites}
                      key={user.id}
                      user={user}
                      studies={studies}
                      index={index}
                      onUpdate={handleUpdateUser}
                      onDelete={handleDeleteUser}
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
            <Text size="1" color="gray">Total Users:</Text>
            <Text size="2" weight="bold">{stats.total}</Text>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Active:</Text>
            <Badge color="green" variant="soft">{stats.active}</Badge>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Pending:</Text>
            <Badge color="orange" variant="soft">{stats.pending}</Badge>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Inactive:</Text>
            <Badge color="gray" variant="soft">{stats.inactive}</Badge>
          </Flex>
          <Separator orientation="vertical" />
          <Flex gap="2" align="center">
            <Text size="1" color="gray">Terminated:</Text>
            <Badge color="red" variant="soft">{stats.terminated}</Badge>
          </Flex>
        </Flex>
      </Card>

      {/* Structure Preview */}
      <StructurePreview structure={userObject} />

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Content maxWidth="450px" aria-describedby={undefined}>
          <Dialog.Title>Confirm Delete</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Are you sure you want to delete user <Strong>{userToDelete?.name}</Strong>? 
            This action cannot be undone.
          </Dialog.Description>
          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button
                variant="solid"
                color="red"
                onClick={confirmDeleteUser}
              >
                <FiTrash2 /> Delete User
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};

export default UserManager;