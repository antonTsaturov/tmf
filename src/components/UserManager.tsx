'use client'
import { useState, useCallback, FC, ChangeEvent, KeyboardEvent, useEffect, useContext } from 'react';
import '../styles/SiteManager.css'; // Можно создать отдельный стиль UserManager.css
import { AdminContext } from '@/wrappers/AdminContext';
import { CustomSelect } from './Select';
import { StudyUser, OrganisationType, UserRole, UserStatus, UserPermissions, StudySite, Study } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from './Preview';
import { useEntityState } from '@/hooks/useEntityState';
import { RoleSelector, SelectorValue, SiteSelector, StudySelector } from './PseudoSelector';
import { deleteRecord } from '@/lib/api/fetch';
import { getPermissionsForRole} from '@/lib/auth/permissions';
import { v4 as uuidv4 } from 'uuid';

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

// Генерация ID пользователя
// const generateId = (currentStudyId:number): number => {
//   const random = Math.floor(Math.random() * 100000);
//   return parseInt(`${currentStudyId}${random}`);
// };

// Компонент бейджа статуса
const StatusBadge: FC<StatusBadgeProps> = ({ status, onChange, editable = false }) => {
  const [isEditing, setIsEditing] = useState(false);

  const statusConfig = {
    [UserStatus.ACTIVE]: { label: 'Active', color: '#51cf66', icon: '🟢' },
    [UserStatus.INACTIVE]: { label: 'Inactive', color: '#868e96', icon: '⚪' },
    [UserStatus.PENDING]: { label: 'Pending', color: '#ff922b', icon: '🟡' },
    [UserStatus.TERMINATED]: { label: 'Terminated', color: '#ff6b6b', icon: '🔴' },
  };

  const config = statusConfig[status];

  const handleStatusChange = (newStatus: UserStatus) => {
    if (onChange) {
      onChange(newStatus);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="status-editor">
        {Object.entries(statusConfig).map(([statusKey, config]) => (
          <button
            key={statusKey}
            className="status-option"
            onClick={() => handleStatusChange(statusKey as UserStatus)}
            style={{ backgroundColor: config.color }}
            title={config.label}
          >
            {config.icon}
          </button>
        ))}
        <button 
          className="status-cancel"
          onClick={() => setIsEditing(false)}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`status-badge ${editable ? 'editable' : ''}`}
      style={{ backgroundColor: config.color }}
      onClick={editable ? () => setIsEditing(true) : undefined}
      title={editable ? 'Click to change status' : config.label}
    >
      {config.icon} {config.label}
    </div>
  );
};

// Компонент бейджа роли
const RoleBadge: FC<{ role: UserRole }> = ({ role }) => {
  const roleConfig = {
    [UserRole.ADMIN]: { label: 'Admin', color: '#e64980' },
    [UserRole.STUDY_MANAGER]: { label: 'Study Manager', color: '#228be6' },
    [UserRole.DATA_MANAGER]: { label: 'Data Manager', color: '#20c997' },
    [UserRole.MONITOR]: { label: 'Monitor', color: '#fd7e14' },
    [UserRole.INVESTIGATOR]: { label: 'Investigator', color: '#be4bdb' },
    [UserRole.COORDINATOR]: { label: 'Coordinator', color: '#15aabf' },
    [UserRole.AUDITOR]: { label: 'Auditor', color: '#fab005' },
    [UserRole.QUALITY_ASSURANCE]: { label: 'QA', color: '#40c057' },
    [UserRole.READ_ONLY]: { label: 'Read Only', color: '#868e96' },
  };

  const config = roleConfig[role];

  return (
    <span 
      className="role-badge"
      style={{ color: config.color, fontWeight: 600 }}
      title={config.label}
    >
      {config.label}
    </span>
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

  const handleSelectChange = (field: keyof StudyUser) => (
    e: ChangeEvent<HTMLSelectElement>
  ) => {
    setEditData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && isEditing) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

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
    <div
      className="site-item" // Используем те же классы для единообразия
      style={{ animationDelay: `${index * 0.05}s` }}
      onKeyDown={handleKeyDown}
      data-testid={`user-${user.id}`}
    >
      <div className="site-item-rows">
        <div className="site-item-first-row">
          <div className="site-item-first-row-left-block">
            <div className="site-index">
              <span className="index-number">{index + 1}</span>
            </div>

            <div className="site-details">
              {isEditing ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={handleInputChange('name')}
                    placeholder="Full name *"
                    className="site-input"
                    autoFocus
                    required
                  />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={handleInputChange('email')}
                    placeholder="Email *"
                    className="site-input"
                    required
                  />
                  <input
                    type="text"
                    value={editData.title}
                    onChange={handleInputChange('title')}
                    placeholder="Job Title"
                    className="site-input"
                  />
                  
                  <select
                    value={editData.organisation}
                    onChange={handleSelectChange('organisation')}
                    className="site-input"
                    required
                  >
                    <option value="">Select Organisation *</option>
                    <option value="CRO">CRO</option>
                    <option value="SPONSOR">Sponsor</option>
                    <option value="SITE">Site</option>
                  </select>

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
                    placeholder="Select sites..."
                    disabled={false}
                    //showSiteDetails={true}
                  />            
                </div>
              ) : (
                <div className="display-details">
                  <div className="study-header">
                    <h3 className="site-name">{user.name}</h3>
                    <span className="site-number">{user.email}</span>
                  </div>

                  <div className="site-meta">
                    <div className="site-meta-item">
                      <span className="meta-label">Title: </span>
                      <span className="meta-value">
                        {user.title || 'Not specified'}
                      </span>
                    </div>
                    <div className="site-meta-item">
                      <span className="meta-label">Organisation: </span>
                      <span className="meta-value">
                        {user.organisation}
                      </span>
                    </div>
                    <div className="site-meta-item">
                      <span className="meta-label">Role: </span>
                      <span className="meta-value roles-list">
                        {user.role.map(role => (
                          <RoleBadge key={role} role={role} />
                        ))}
                      </span>
                    </div>
                    <div className="site-meta-item">
                      <span className="meta-label">Last Login: </span>
                      <span className="meta-value">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString() 
                          : 'Never'
                        }
                      </span>
                    </div>
                    <div className="site-meta-item">
                      <span className="meta-label">Assigned Studies: </span>
                      <span className="meta-value">
                        {studies && user
                          ? studies.filter(study => user.assigned_study_id.includes(Number(study.id))).map((study) => (
                            <li style={{marginLeft: '20px'}} key={study.id}>
                              {study.protocol}
                            </li>))
                          : 'No studies assigned'
                        }
                      </span>
                    </div>
                    <div className="site-meta-item">
                      <span className="meta-label">Assigned Sites: </span>
                      <span className="meta-value">
                        {sites && user
                          ?
                          sites
                          .filter(site => user.assigned_site_id.includes(Number(site.id)))
                          .map((site) => (
                            <li style={{marginLeft: '20px'}} key={site.id}>
                              {site.name}
                            </li>))
                          : 'No sites assigned'
                        }
                      </span>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="site-status">
            <StatusBadge 
              status={user.status}
              onChange={(newStatus) => onUpdate(user.id, { status: newStatus })}
              editable={!isEditing}
            />
          </div>
        </div>
        <div className="site-item-second-row">
          <div className="site-actions">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave}
                  className="action-button save-button"
                  title="Save changes"
                >
                  💾 Save
                </button>
                <button 
                  onClick={handleCancel}
                  className="action-button cancel-button"
                  title="Cancel editing"
                >
                  ✕ Cancel
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="action-button edit-button"
                  title="Edit user"
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => onDelete(user.id)}
                  className="action-button delete-button"
                  title="Delete user"
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Основной компонент
const UserManager: FC<UserManagerProps> = () => {
  const { studies, saveUser, loadTable, loadTablePartial, loadAllUsers } = useContext(AdminContext)!;

  const [sites, setSites] = useState<StudySite[]>([]);
  
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
      //console.log('newPermissions: ', newPermissions)
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
      alert('Please fill all required fields: Name and Email.');
      return;
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserForm.email)) {
      alert('Please enter a valid email address.');
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
      failed_login_attempts: 0,
      created_at: new Date().toISOString()
    };

    const response = await saveUser(Tables.USERS, newUser);
    if (response) {
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
      console.log('User nod saved in DB')
    }

  }, [newUserForm, addUser]);

  // Обновление пользователя
  const handleUpdateUser = useCallback((id: StudyUser['id'], updates: Partial<StudyUser>) => {
    updateUser(id, updates);
  }, [updateUser]);

  // Удаление пользователя
  const handleDeleteUser = useCallback( async (id: StudyUser['id']) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    
    const response = await deleteRecord(Tables.USERS, id);
    if (response) {
      removeUser(id);
    } else {
      console.log('Error. User record not deleted')
    }
  }, [removeUser]);

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
      //console.log('Users Structure:', newUserForm);
    };
    generateUserObject();
    //console.log('Structure generated')
  }, [newUserForm, managedUsers, loadTablePartial]);

  // Функция для загрузки списка пользователей
  // Вынесена отдельно, так как используется повторно после добавления нового пользователя
  const loadUsers = async () => {
    try {
      const loadedUsers = await loadAllUsers();
      const studyUsers = loadedUsers as unknown as StudyUser[];
      //console.log('studyUsers: ', studyUsers)
      if (studyUsers ) {
        setManagedUsers(studyUsers);
      } else {
        setManagedUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setManagedUsers([]);
    }
  };

  // Загрузка пользователей и центров 
  useEffect(() => {
    const loadSites = async () => {
      try {
        const loadedSites = await loadTable(Tables.SITE);
        const userSites = loadedSites as unknown as StudySite[]

        if (userSites ) {
          setSites(userSites);
        } else {
          setSites([]);
        }
        //console.log('Sites loaded:', sites)
      } catch (error) {
        console.error('Error loading sites:', error);
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

  
  return (
    <div className="site-manager-container">
      <div className="site-manager-header">
        <h2>Users Management</h2>
        <div className="controls">
          <button 
            onClick={handleReset}
            className="action-button reset-button"
          >
            🔄 Reset
          </button>
        </div>
      </div>
      
      <div className="edit-block">
        {/* Форма добавления нового пользователя */}
        <div className="add-site-form">
          <h3>➕ New User</h3>
          <div className="site-form-grid">

            
            {/* <CustomSelect
              studies={studies}
              studyHandler={studyHandler}
            /> */}

            <label>Full Name*</label>
            <input
              type="text"
              value={newUserForm.name}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full name *"
              className="form-input"
              required
            />
            
            <label>Email*</label>
            <input
              type="email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Email address *"
              className="form-input"
              required
            />
            
            <label>Job Title</label>
            <input
              type="text"
              value={newUserForm.title}
              onChange={(e) => setNewUserForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Job title"
              className="form-input"
            />
            
            <label>Organisation*</label>
            <select
              value={newUserForm.organisation}
              onChange={(e) => setNewUserForm(prev => ({ 
                ...prev, 
                organisation: e.target.value as OrganisationType 
              }))}
              className="form-input"
              required
            >
              <option value="CRO">CRO</option>
              <option value="SPONSOR">Sponsor</option>
              <option value="SITE">Site</option>
            </select>
            
            <label>Role</label>
            <RoleSelector 
              selectedValues={newUserForm.roles}
              onChange={handleRolesChange}
              placeholder="Select user roles..."
              disabled={false}
            />

            <label>Assigned Study</label>   
            <StudySelector
              availableOptions={studies}
              selectedValues={newUserForm.assigned_study_id}
              onChange={handleStudyChange}
              placeholder="Select studies..."
              disabled={false}
              //multiple={true}
            />
            <label>Assigned Sites</label>
            <SiteSelector 
              availableOptions={sites}
              selectedValues={newUserForm.assigned_site_id}
              onChange={handleSitesChange}
              placeholder="Select assigned sites..."
              disabled={false}
            />            
 
            <button 
              onClick={handleAddUser}
              className="add-button"
              disabled={!newUserForm.name.trim() || !newUserForm.email.trim()}
            >
              Add User
            </button>
          </div>
        </div>

        {/* Список пользователей */}
        <div className="sites-list">
          <div className="list-header">
            <div className="header-index">#</div>
            <div className="header-details">User Details</div>
            <div className="header-status">Status</div>
          </div>
          <div className="sites-list-items">
            {managedUsers?.map((user, index) => (
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
          </div>          
        </div>
      </div>

      {/* Статистика */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Users:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active:</span>
          <span className="stat-value active">{stats.active}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Pending:</span>
          <span className="stat-value inactive">{stats.pending}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Inactive:</span>
          <span className="stat-value locked">{stats.inactive}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Terminated:</span>
          <span className="stat-value terminated">{stats.terminated}</span>
        </div>
      </div>
      
      <StructurePreview
        structure={userObject}
      />
    </div>
  );
};

export default UserManager;