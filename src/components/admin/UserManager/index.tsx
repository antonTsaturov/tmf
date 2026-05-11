// src/components/admin/UserManager/index.tsx
'use client'
import { useState, useCallback, FC, useEffect, useContext } from 'react';
import { Box, Flex, Text, Heading, Button, TextField, Select, Badge, Card, Separator, Dialog,
  Strong, ScrollArea,
} from '@radix-ui/themes';
import { FiPlus, FiTrash2,  FiUsers, FiRefreshCw } from 'react-icons/fi';
import { AdminContext } from '@/wrappers/AdminContext';
import { StudyUser, OrganisationType, UserRole, UserStatus, UserPermissions, StudySite } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from '../StructurePreview';
import { useEntityState } from '@/hooks/useEntityState';
import { useNotification } from '@/wrappers/NotificationContext';
import { RoleSelector, SelectorValue, SiteSelector, StudySelector } from '../../PseudoSelector';
import { deleteRecord } from '@/lib/api/fetch';
import { getPermissionsForRole} from '@/lib/auth/permissions';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';
import UserItem from './UserItem';

interface UserManagerProps {
  initialUsers?: StudyUser[];
}


// Компонент бейджа страны
// const CountryBadge: FC<{ countryCode: string }> = ({ countryCode }) => {
//   const country = AVAILABLE_COUNTRIES.find(c => c.code === countryCode);
//   return (
//     <Badge size="1" variant="surface" color="blue">
//       {country?.name || countryCode}
//     </Badge>
//   );
// };

// Компонент элемента пользователя

// Основной компонент
const UserManager: FC<UserManagerProps> = () => {
  const { studies, saveUser, loadTable, loadTablePartial, loadAllUsers } = useContext(AdminContext)!;
  const { addNotification } = useNotification();

  const [sites, setSites] = useState<StudySite[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<StudyUser | null>(null);
  const [filterSite, setFilterSite] = useState<number | null>(null);
  const [filterStudy, setFilterStudy] = useState<number | null>(null);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  
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
    assigned_site_id: number[];
    assigned_study_id: number[];
    assigned_countries: string[];
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
    assigned_countries: [],
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

    const newUser: Partial<StudyUser> = {
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
          assigned_countries: [],
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
    setNewUserForm(prev => ({
      ...prev,
      assigned_site_id: siteID
    }));
  };

  const handleStudyChange = (studyID: number[]) => {
    setNewUserForm(prev => ({
      ...prev,
      assigned_study_id: studyID
    }));
  };

  const handleCountriesChange = (countries: string[]) => {
    setNewUserForm(prev => ({
      ...prev,
      assigned_countries: countries
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
    };
    
    return stats;
  };

  const stats = getStats();

  // Filter users based on selected site, study, and country
  const filteredUsers = managedUsers?.filter(user => {
    const matchesSite = filterSite === null || user.assigned_site_id.includes(filterSite);
    const matchesStudy = filterStudy === null || user.assigned_study_id.includes(filterStudy);
    //const matchesCountry = filterCountry === null || (user.assigned_countries || []).includes(filterCountry);
    return matchesSite && matchesStudy// && matchesCountry;
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
                <Text size="1" weight="medium">Job Title</Text>
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
                <Text size="1" weight="medium">Assigned Studies</Text>
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
              <Flex direction="column" gap="1">
                <Text size="1" weight="medium">Assigned Countries</Text>
                {/* <CountrySelector
                  availableOptions={.map(c => ({ id: c.code, name: c.name }))}
                  selectedValues={newUserForm.assigned_countries}
                  onChange={handleCountriesChange}
                  placeholder="Select countries..."
                  disabled={false}
                /> */}
              </Flex>
              <Button
                size="2"
                color="green"
                onClick={handleAddUser}
                disabled={
                  !newUserForm.name.trim()
                  || !newUserForm.email.trim()
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

              <Box style={{ flex: 1 }}>
                <Text size="1" weight="medium" mb="1">Filter by Country</Text>
                <Select.Root
                  value={filterCountry || 'all'}
                  onValueChange={(value) => setFilterCountry(value === 'all' ? null : value)}
                >
                  <Select.Trigger placeholder="All countries" style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="all">All countries</Select.Item>
                    {/* {AVAILABLE_COUNTRIES.map(country => (
                      <Select.Item key={country.code} value={country.code}>
                        {country.name}
                      </Select.Item>
                    ))} */}
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