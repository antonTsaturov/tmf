// src/components/admin/UserManager/UserItem.tsx

import { SelectorValue, RoleSelector } from "@/components/PseudoSelector";
import { getPermissionsForRole } from "@/lib/auth/permissions";
import { StudyUser, UserRole, OrganisationType, UserStatus } from "@/types/user";
import { Card, Flex, TextField, Badge, Button, Select, Tooltip, 
          Separator, Text, DropdownMenu, Dialog, Box, IconButton, ScrollArea, 
          Checkbox
} from "@radix-ui/themes";
import { FC, useState, ChangeEvent, useMemo, useEffect } from "react";
import { FiCheck, FiX, FiEdit2, FiTrash2, FiMapPin, FiGlobe } from "react-icons/fi";
import { StudySite } from "@/types/site";
import { Study } from "@/types/study";
import { ROLE_CONFIG as roleConfig } from '@/types/types';

interface UserItemProps {
  user: StudyUser;
  sites: StudySite[];
  studies: Study[]; // Полный массив объектов studies
  index: number;
  onUpdate: (id: StudyUser['id'], updates: Partial<StudyUser>) => void;
  onDelete: (id: StudyUser['id']) => void;
}

interface StatusBadgeProps {
  status: UserStatus;
  onChange?: (status: UserStatus) => void;
  editable?: boolean;
}

interface StudyAssignmentCardProps {
  study: Study;
  assignedSiteIds: number[];
  assignedCountryCodes: string[];
  onUpdateSites: (siteIds: number[]) => void;
  onUpdateCountries: (countryCodes: string[]) => void;
  onRemove: () => void;
}

// Компонент бейджа статуса
const StatusBadge: FC<StatusBadgeProps> = ({ status, onChange, editable = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusConfig = {
    [UserStatus.ACTIVE]: { label: 'Active', color: 'green', icon: '🟢' },
    [UserStatus.INACTIVE]: { label: 'Inactive', color: 'gray', icon: '⚪' },
    [UserStatus.PENDING]: { label: 'Pending', color: 'orange', icon: '🟡' },
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

// Компонент для отображения назначения на исследование
const StudyAssignmentCard: FC<StudyAssignmentCardProps> = ({
  study,
  assignedSiteIds,
  assignedCountryCodes,
  onUpdateSites,
  onUpdateCountries,
  onRemove
}) => {
  const [isEditingSites, setIsEditingSites] = useState(false);
  const [isEditingCountries, setIsEditingCountries] = useState(false);
  const [tempSiteIds, setTempSiteIds] = useState<number[]>(assignedSiteIds);
  const [tempCountryCodes, setTempCountryCodes] = useState<string[]>(assignedCountryCodes);

  // Получаем список всех центров для этого исследования
  const studySites = study.sites || [];
  
  // Получаем информацию о назначенных центрах
  const assignedSitesInfo = studySites.filter(site => tempSiteIds.includes(Number(site.id)));
  
  // Получаем список стран для этого исследования из объекта study
  const studyCountries = study.countries || [];
  
  const handleSaveSites = () => {
    onUpdateSites(tempSiteIds);
    setIsEditingSites(false);
  };

  const handleSaveCountries = () => {
    onUpdateCountries(tempCountryCodes);
    setIsEditingCountries(false);
  };

  // Функция для проверки, выбран ли сайт
  const isSiteSelected = (siteId: number) => tempSiteIds.includes(siteId);
  
  // Функция для переключения выбора сайта
  const toggleSite = (siteId: number) => {
    setTempSiteIds(prev => 
      prev.includes(siteId) 
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  // Функция для переключения выбора страны
  const toggleCountry = (country: string) => {
    setTempCountryCodes(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  useEffect(() => {
    setTempSiteIds(assignedSiteIds);
  }, [assignedSiteIds]);

  useEffect(() => {
    setTempCountryCodes(assignedCountryCodes);
  }, [assignedCountryCodes]);  

  return (
    <Card variant="surface" style={{ backgroundColor: 'var(--gray-2)' }}>
      <Flex direction="column" gap="3">
        {/* Заголовок исследования */}
        <Flex justify="between" align="start">
          <Box style={{ flex: 1 }}>
            <Flex gap="2" align="center" wrap="wrap">
              <Text size="2" weight="bold">{study.protocol}</Text>
              <Badge size="1" variant="soft" color={study.status === 'ongoing' ? 'green' : 'gray'}>
                {study.status}
              </Badge>
            </Flex>
            <Text size="1" color="gray" style={{ marginTop: 4 }}>
              {study.title?.length > 100 ? `${study.title.substring(0, 100)}...` : study.title}
            </Text>
            <Flex gap="2" mt="1">
              <Text size="1" color="gray">Sponsor: {study.sponsor}</Text>
              {study.cro && <Text size="1" color="gray">CRO: {study.cro}</Text>}
            </Flex>
          </Box>
          <IconButton size="1" variant="soft" color="red" onClick={onRemove}>
            <FiTrash2 />
          </IconButton>
        </Flex>

        <Separator size="2" />

        {/* Секция центров */}
        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Flex gap="1" align="center">
              <FiMapPin size={14} />
              <Text size="1" weight="medium" color="gray">Assigned Sites</Text>
              <Badge size="1" variant="surface">{assignedSitesInfo.length} / {studySites.length}</Badge>
            </Flex>
            {!isEditingSites && studySites.length > 0 && (
              <Button size="1" variant="ghost" onClick={() => setIsEditingSites(true)}>
                <FiEdit2 size={12} /> Edit
              </Button>
            )}
          </Flex>

          {isEditingSites ? (
            <Flex direction="column" gap="2">
              <Box style={{ maxHeight: 200, overflow: 'auto' }}>
                <Flex direction="column" gap="1">
                  {studySites.map(site => (
                    <Flex key={site.id} align="center" gap="2" p="1">
                      <Box style={{ flex: 1 }}>
                        <Text size="2" as="label" htmlFor={`site-${site.id}`} >
                          
                          <Flex as="span" gap="2">
                            <Checkbox
                              id={`site-${site.id}`}
                              checked={isSiteSelected(Number(site.id))}
                              onCheckedChange={() => toggleSite(Number(site.id))}
                              style={{ cursor: 'pointer' }}
                              defaultChecked
                            />
                              {site.name}
                          </Flex>
                        </Text>
                        <Text size="1" color="gray"> ({site.city}, {site.country})</Text>
                      </Box>
                      {site.principal_investigator && (
                        <Text size="1" color="gray">PI: {site.principal_investigator}</Text>
                      )}
                    </Flex>
                  ))}
                </Flex>
              </Box>
              <Flex gap="2" justify="end">
                <Button size="1" variant="soft" 
                  onClick={() => {
                    setTempSiteIds(assignedSiteIds);
                    setIsEditingSites(false);
                  }}>
                  Cancel
                </Button>

                <Button 
                  size="1" 
                  onClick={handleSaveSites}
                >
                  Save
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex gap="1" wrap="wrap">
              {assignedSitesInfo.length > 0 ? (
                assignedSitesInfo.map(site => (
                  <Tooltip key={site.id} content={`${site.city}, ${site.country}${site.principal_investigator ? ` | PI: ${site.principal_investigator}` : ''}`}>
                    <Badge size="1" variant="surface" color="gray">
                      {site.name}
                    </Badge>
                  </Tooltip>
                ))
              ) : (
                <Text size="1" color="gray">No sites assigned</Text>
              )}
            </Flex>
          )}
        </Flex>

        {/* Секция стран */}
        {studyCountries. length > 1 && <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Flex gap="1" align="center">
              <FiGlobe size={14} />
              <Text size="1" weight="medium" color="gray">Assigned Countries</Text>
              <Badge size="1" variant="surface">{assignedCountryCodes.length} / {studyCountries.length}</Badge>
            </Flex>
            {!isEditingCountries && studyCountries.length > 0 && (
              <Button size="1" variant="ghost" onClick={() => setIsEditingCountries(true)}>
                <FiEdit2 size={12} /> Edit
              </Button>
            )}
          </Flex>

          {isEditingCountries ? (
            <Flex direction="column" gap="2">
              <Flex direction="column" gap="1">
                {studyCountries.map(country => (
                  <Flex key={country} align="center" gap="2" p="1">
                    <Text size="2" as="label" htmlFor={`country-${country}`}>
                      <Flex as="span" gap="2">
                        <Checkbox
                          id={`country-${country}`}
                          checked={tempCountryCodes.includes(country)}
                          onCheckedChange={() => toggleCountry(country)}
                          style={{ cursor: 'pointer' }}
                        />
                        {country}
                      </Flex>
                    </Text>
                  </Flex>
                ))}
              </Flex>
              <Flex gap="2" justify="end">
                <Button 
                  size="1" 
                  variant="soft" 
                  onClick={() => {
                    setTempCountryCodes(assignedCountryCodes);
                    setIsEditingCountries(false);
                  }}
                >
                  Cancel
                </Button>
                
                <Button
                  size="1" 
                  onClick={handleSaveCountries}
                >
                  Save
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex gap="1" wrap="wrap">
              {assignedCountryCodes.length > 0 ? (
                assignedCountryCodes.map(countryCode => (
                  <Badge key={countryCode} size="1" variant="surface" color="blue">
                    {countryCode}
                  </Badge>
                ))
              ) : (
                <Text size="1" color="gray">No countries assigned</Text>
              )}
            </Flex>
          )}
        </Flex>}
      </Flex>
    </Card>
  );
};

const UserItem: FC<UserItemProps> = ({ user, sites, studies, index, onUpdate, onDelete }) => {
  const assignedSiteIds = user?.assigned_site_id || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<StudyUser>>({
    name: user.name,
    email: user.email,
    title: user.title,
    organisation: user.organisation,
    status: user.status,
    role: user.role,
    assigned_study_id: user.assigned_study_id,
    assigned_site_id: user.assigned_site_id,
    assigned_country_by_study: user.assigned_country_by_study
  });


  // Функция для сброса данных
  const resetEditData = () => {
    setEditData({
      name: user.name,
      email: user.email,
      title: user.title,
      organisation: user.organisation,
      status: user.status,
      role: user.role,
      assigned_study_id: user.assigned_study_id,
      assigned_site_id: user.assigned_site_id,
      assigned_country_by_study: user.assigned_country_by_study
    });
  };  
  // Получаем назначенные исследования с полной информацией
  const assignedStudies = useMemo(() => {
    return studies.filter(study => 
      (editData.assigned_study_id || []).includes(study.id)
    );
  }, [studies, editData.assigned_study_id]);

  const handleInputChange = (field: keyof StudyUser) => (
    e: ChangeEvent<HTMLInputElement>
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

    onUpdate(user.id, editData);
    setIsModalOpen(false);
    resetEditData();
  };

  const handleRolesChange = (roles: SelectorValue[]) => {
    const userRole = roles as UserRole[];
    setEditData(prev => ({
      ...prev,
      role: userRole,
      permissions: getPermissionsForRole(userRole)
    }));
  };

  const handleAddStudy = (studyId: number) => {
    if (!editData.assigned_study_id?.includes(studyId)) {
      setEditData(prev => ({
        ...prev,
        assigned_study_id: [...(prev.assigned_study_id || []), studyId]
      }));
    }
  };

  const handleRemoveStudy = (studyId: number) => {
    // Находим исследование
    const study = studies.find(s => s.id === studyId);
    const validSiteIdsForThisStudy = (study?.sites || []).map(s => Number(s.id));
    
    setEditData(prev => ({
      ...prev,
      assigned_study_id: (prev.assigned_study_id || []).filter(id => id !== studyId),
      // Удаляем все сайты, принадлежащие этому исследованию
      assigned_site_id: (prev.assigned_site_id || []).filter(siteId => {
        return !validSiteIdsForThisStudy.includes(Number(siteId));
      })
    }));
  };

  const handleUpdateStudySites = (studyId: number, siteIds: number[]) => {
    // Находим исследование
    const study = studies.find(s => s.id === studyId);
    const validSiteIdsForThisStudy = (study?.sites || []).map(s => Number(s.id));
    
    // Оставляем сайты ДРУГИХ исследований
    const otherSites = (editData.assigned_site_id || []).filter(siteId => {
      return !validSiteIdsForThisStudy.includes(Number(siteId));
    });
    
    // Убираем дубликаты
    const uniqueSites = [...new Set(otherSites), ...new Set(siteIds)];
    
    setEditData(prev => ({
      ...prev,
      assigned_site_id: [...new Set(uniqueSites)]
    }));
  };

const handleUpdateStudyCountries = (studyId: number, countryCodes: string[]) => {
  setEditData(prev => {
    const updated = {
      ...prev,
      assigned_country_by_study: {
        ...(prev.assigned_country_by_study || {}), // Добавьте || {} на всякий случай
        [studyId]: countryCodes
      }
    };
    return updated;
  });
};
  const handleClose = () => {
    setIsModalOpen(false);
    resetEditData(); // Сбрасываем при закрытии
  };  

  // Доступные исследования для добавления
  const availableStudiesToAdd = studies.filter(
    study => !(editData.assigned_study_id || []).includes(study.id)
  );

  return (
    <>
      {/* User Card - Click to open modal */}
      <Card 
        variant="surface" 
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        onClick={() => setIsModalOpen(true)}
      >
        <Flex direction="column" gap="3">
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
                  <Flex gap="1" align="center" >
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
                
                {/* Studies Summary with icons */}
                <Flex gap="2" wrap="wrap">
                  {user.assigned_study_id.length > 0 && (
                    <Badge color="blue" variant="surface">
                      <Flex gap="1" align="center">
                        <Text size="1">{user.assigned_study_id.length}</Text>
                        <Text size="1" color="gray">Studies</Text>
                      </Flex>
                    </Badge>
                  )}
                  {user.assigned_site_id.length > 0 && (
                    <Badge color="gray" variant="surface">
                      <Flex gap="1" align="center">
                        <Text size="1">{user.assigned_site_id.length}</Text>
                        <Text size="1" color="gray">Sites</Text>
                      </Flex>
                    </Badge>
                  )}
                </Flex>
              </Flex>
            </Flex>

            {/* Status */}
            <Flex direction="column" gap="2" onClick={(e) => e.stopPropagation()}>
              <Text size="1" weight="medium">Status</Text>
              <StatusBadge
                status={user.status}
                onChange={(newStatus) => onUpdate(user.id, { status: newStatus })}
                editable={true}
              />
            </Flex>
          </Flex>

          {/* Actions */}
          <Separator size="4" />
          <Flex justify="end" gap="2" onClick={(e) => e.stopPropagation()}>
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
          </Flex>
        </Flex>
      </Card>

      {/* Edit Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={(open) => {
        if (!open) handleClose(); // При закрытии через крестик
      }}>
        <Dialog.Content maxWidth="900px" style={{ maxHeight: '85vh', overflow: 'auto' }}>
          <Dialog.Title>
            <Flex gap="2" align="center" justify="between">
              <FiEdit2 />
              Edit User: {user.name}
            <Dialog.Close>
              <IconButton variant="ghost" size="2"><FiX /> </IconButton>
            </Dialog.Close>

            </Flex>
          </Dialog.Title>
          
          <ScrollArea style={{ maxHeight: 'calc(85vh - 120px)' }}>
            <Flex direction="column" gap="4" mt="4" p="2">
              {/* Basic Information Section */}
              <Card>
                <Flex direction="column" gap="3">
                  <Text size="2" weight="bold">Basic Information</Text>
                  <Separator size="2" />
                  
                  <Flex gap="3" wrap="wrap">
                    <Box style={{ flex: 1 }}>
                      <Text size="1" weight="medium">Full Name *</Text>
                      <TextField.Root
                        value={editData.name}
                        onChange={handleInputChange('name')}
                        placeholder="Full name"
                      />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text size="1" weight="medium">Email *</Text>
                      <TextField.Root
                        type="email"
                        value={editData.email}
                        onChange={handleInputChange('email')}
                        placeholder="Email"
                      />
                    </Box>
                  </Flex>

                  <Flex gap="3" wrap="wrap">
                    <Box style={{ flex: 1 }}>
                      <Text size="1" weight="medium">Job Title</Text>
                      <TextField.Root
                        value={editData.title}
                        onChange={handleInputChange('title')}
                        placeholder="Job Title"
                      />
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Flex direction="column" gap="1" mt="1">
                        <Text size="1" weight="medium">Organisation</Text>
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
                      </Flex>
                    </Box>
                  </Flex>

                  <Box>
                    <Text size="1" weight="medium">Roles *</Text>
                    <RoleSelector
                      selectedValues={editData.role as UserRole[]}
                      onChange={handleRolesChange}
                      placeholder="Select user roles..."
                      disabled={false}
                    />
                  </Box>
                </Flex>
              </Card>

              {/* Study Assignments Section */}
              <Card>
                <Flex justify="between" align="center" mb="3">
                  <Text size="2" weight="bold">Study Assignments</Text>
                  {availableStudiesToAdd.length > 0 && (
                    <Select.Root onValueChange={(value) => handleAddStudy(Number(value))}>
                      <Select.Trigger placeholder="+ Add Study" />
                      <Select.Content>
                        {availableStudiesToAdd.map(study => (
                          <Select.Item key={study.id} value={study.id.toString()}>
                            {study.protocol}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                </Flex>
                
                <Separator size="2" mb="3" />
                
                <Flex direction="column" gap="3">
                  {assignedStudies.length === 0 ? (
                    <Text size="2" color="gray" align="center">No studies assigned. Click "Add Study" to assign one.</Text>
                  ) : (
                    assignedStudies.map(study => 
                      
                      <StudyAssignmentCard
                        key={`${study.id}-${isModalOpen}`}
                        study={study}
                        assignedSiteIds={assignedSiteIds}
                        assignedCountryCodes={editData.assigned_country_by_study?.[study.id] || []}
                        onUpdateSites={(siteIds) => handleUpdateStudySites(study.id, siteIds)}
                        onUpdateCountries={(countryCodes) => handleUpdateStudyCountries(study.id, countryCodes)}
                        onRemove={() => handleRemoveStudy(study.id)}
                      />
                    )
                  )}
                </Flex>
              </Card>
            </Flex>
          </ScrollArea>

          <Flex gap="3" justify="end" mt="4">
            <Button variant="soft" color="gray" onClick={handleClose}>
              Cancel
            </Button>
            <Button color="green" onClick={handleSave}>
              <FiCheck /> Save Changes
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

export default UserItem;