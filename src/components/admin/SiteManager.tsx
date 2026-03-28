// export default SiteManager;

'use client'
import { useState, useCallback, FC, ChangeEvent, KeyboardEvent, useEffect, useContext } from 'react';
import '@/styles/SiteManager.css';
import { AdminContext } from '@/wrappers/AdminContext';
import { CustomSelect } from '../Select';
import { StudySite, SiteStatus, Study } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from './StructurePreview';
import { deleteRecord } from '@/lib/api/fetch';
import { CountrySelector, SelectorValue } from '../PseudoSelector';

// Пропсы компонентов
interface StatusBadgeProps {
  status: SiteStatus;
  onChange?: (status: SiteStatus) => void;
  editable?: boolean;
}

interface SiteItemProps {
  site: StudySite;
  index: number;
  onUpdate: (id: number, updates: Partial<StudySite>) => void;
  onDelete: (id: number) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
}

interface SiteManagerProps {
  initialSites?: StudySite[];
}

// Генерация ID центра в формате 47251770567792480
const generateId = (siteID: number): number => {
  const random = Math.floor(Math.random() * 100000);
  return parseInt(`${siteID}${random}`);
}

// Компонент бейджа статуса
const StatusBadge: FC<StatusBadgeProps> = ({ status, onChange, editable = false }) => {
  const [isEditing, setIsEditing] = useState(false);

  const statusConfig = {
    [SiteStatus.OPENED]: { label: 'Opened', color: '#51cf66', icon: '🟢' },
    [SiteStatus.PLANNED]: { label: 'Planned', color: '#ff922b', icon: '🟡' },
    [SiteStatus.CLOSED]: { label: 'Closed', color: '#ff6b6b', icon: '🔒' },
    [SiteStatus.FROZEN]: { label: 'Frozen', color: '#3b5bff', icon: '❄️' },
  };

  const config = statusConfig[status];

  const handleStatusChange = (newStatus: SiteStatus) => {
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
            onClick={() => handleStatusChange(statusKey as SiteStatus)}
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

// Компонент элемента центра
const SiteItem: FC<SiteItemProps> = ({ site, index, onUpdate, onDelete, onMove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<StudySite>>({
    name: site.name,
    city: site.city,
    country: site.country,
    principal_investigator: site.principal_investigator,
    number: site.number
  });

  const handleInputChange = (field: keyof StudySite) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setEditData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setEditData(prev => ({
        ...prev,
        number: value
      }));
    }
  };

  const handleSave = () => {
    if (!editData.city?.trim() || !editData.country?.trim()) {
      alert('City and Country are required fields.');
      return;
    }
    onUpdate(site.id, editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      name: site.name,
      city: site.city,
      country: site.country,
      principal_investigator: site.principal_investigator,
      number: site.number
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

  return (
    <div
      className="site-item"
      style={{ animationDelay: `${index * 0.05}s` }}
      onKeyDown={handleKeyDown}
      data-testid={`site-${site.id}`}
    >
      <div className="site-item-rows">
        <div className="site-item-first-row">
          <div className="site-item-first-row-left-block">
            <div className="site-index">
              <span className="index-number">{index + 1}</span>
              {onMove && (
                <div className="move-controls">
                  <button 
                    onClick={() => onMove(index, index - 1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => onMove(index, index + 1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>

            <div className="site-details">
              {isEditing ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={handleInputChange('name')}
                    placeholder="Institution name"
                    className="site-input"
                    autoFocus
                  />
                  <input
                    type="number"
                    value={editData.number || site.number}
                    onChange={handleNumberChange}
                    placeholder="Site Number"
                    className="site-input number-input"
                    min="1"
                  />
                  <input
                    type="text"
                    value={editData.city || ''}
                    onChange={handleInputChange('city')}
                    placeholder="City *"
                    className="site-input"
                    required
                  />
                  {/* <input
                    type="text"
                    value={editData.country || ''}
                    onChange={handleInputChange('country')}
                    placeholder="Country *"
                    className="site-input"
                    required
                  /> */}
                  <input
                    type="text"
                    value={editData.principal_investigator || ''}
                    onChange={handleInputChange('principal_investigator')}
                    placeholder="Investigator *"
                    className="site-input"
                    required
                  />
                </div>
              ) : (
                <div className="display-details">
                  <div className="study-header">
                    <h3 className="site-name">{site.name}</h3>
                    <span className="site-number">#{site.number}</span>
                  </div>

                  <div className="site-meta">
                    <div className="site-meta-item">
                      <span className="meta-label">Location: </span>
                      <span className="meta-value">
                        {site.city}, {site.country}
                      </span>
                    </div>
                    <div className="site-meta-item">
                      <span className="meta-label">Investigator: </span>
                      <span className="meta-value">
                        {site.principal_investigator}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="site-status">
            <StatusBadge 
              status={site.status}
              onChange={(newStatus) => onUpdate(site.id, { status: newStatus })}
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
                  title="Edit center"
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => onDelete(site.id)}
                  className="action-button delete-button"
                  title="Delete center"
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
const SiteManager: FC<SiteManagerProps> = () => {
  const { studies, saveSite, loadTable, loadTablePartial } = useContext(AdminContext)!;

  const [allSites, setAllSites] = useState<StudySite[]>([]); // Все центры из БД
  const [filteredSites, setFilteredSites] = useState<StudySite[]>([]); // Отфильтрованные по исследованию
  
  const [currentStudyId, setCurrentStudyId] = useState<number | null>(null);
  const [siteObject, setSiteObject] = useState<StudySite[]>([]);
  const [newSiteForm, setNewSiteForm] = useState({
    name: '',
    number: '',
    city: '',
    principal_investigator: '',
    country: ''
  });

  // Загрузка всех центров при монтировании
  useEffect(() => {
    const loadAllSites = async () => {
      try {
        const loadedSites = await loadTable(Tables.SITE);
        const sites = loadedSites as unknown as StudySite[];
        setAllSites(sites || []);
        console.log('All sites loaded:', sites);
      } catch (error) {
        console.error('Error loading all sites:', error);
        setAllSites([]);
      }
    };

    loadAllSites();
  }, [loadTable]);

  // Фильтрация центров при изменении выбранного исследования или allSites
  useEffect(() => {
    if (currentStudyId) {
      const filtered = allSites.filter(site => site.study_id === currentStudyId);
      setFilteredSites(filtered);
      console.log(`Filtered sites for study ${currentStudyId}:`, filtered);
    } else {
      setFilteredSites([]); // Если исследование не выбрано, показываем пустой список
    }
  }, [currentStudyId, allSites]);

  // Обновление allSites после добавления/обновления/удаления
  const updateAllSites = useCallback((updatedSite: StudySite, action: 'add' | 'update' | 'delete') => {
    setAllSites(prev => {
      let newSites;
      switch (action) {
        case 'add':
          newSites = [...prev, updatedSite];
          break;
        case 'update':
          newSites = prev.map(site => site.id === updatedSite.id ? updatedSite : site);
          break;
        case 'delete':
          newSites = prev.filter(site => site.id !== updatedSite.id);
          break;
        default:
          newSites = prev;
      }
      return newSites;
    });
  }, []);

  // Добавление центра
  const handleAddSite = useCallback(async () => {
    if (!currentStudyId) {
      alert('Please select a study first');
      return;
    }

    if (!newSiteForm.name.trim() || !newSiteForm.number.trim() || 
        !newSiteForm.city.trim() || newSiteForm.country.length < 1 || 
        !newSiteForm.principal_investigator.trim()) {
      alert('Please fill all required fields: Institution Name, Number, City, PI name and Country.');
      return;
    }

    const getProtocol = (): string => {
      const currentStudy = studies.find(study => study.id === currentStudyId);
      if (!currentStudy) {
        throw new Error(`Study with id ${currentStudyId} not found`);
      }
      return currentStudy.protocol;
    }

    const newSite: StudySite = {
      id: generateId(currentStudyId),
      study_id: currentStudyId,
      study_protocol: getProtocol(),
      name: newSiteForm.name.trim(),
      number: parseInt(newSiteForm.number) || 1,
      city: newSiteForm.city.trim(),
      principal_investigator: newSiteForm.principal_investigator.trim(),
      country: newSiteForm.country,
      status: SiteStatus.PLANNED,
    };

    try {
      // Сохраняем в БД
      await saveSite(Tables.SITE, newSite);
      
      // Обновляем локальное состояние
      updateAllSites(newSite, 'add');
      
      // Очищаем форму
      setNewSiteForm({ 
        name: '', 
        number: '', 
        city: '', 
        country: '', 
        principal_investigator: '' 
      });
    } catch (error) {
      console.error('Error adding site:', error);
      alert('Failed to add site. Please try again.');
    }
  }, [newSiteForm, currentStudyId, saveSite, updateAllSites]);

  // Обновление центра
  const handleUpdateSite = useCallback(async (id: number, updates: Partial<StudySite>) => {
    try {
      const siteToUpdate = allSites.find(site => site.id === id);
      if (!siteToUpdate) return;

      const updatedSite = { ...siteToUpdate, ...updates };
      
      // Сохраняем в БД
      await saveSite(Tables.SITE, updatedSite);
      
      // Обновляем локальное состояние
      updateAllSites(updatedSite, 'update');
    } catch (error) {
      console.error('Error updating site:', error);
      alert('Failed to update site. Please try again.');
    }
  }, [allSites, saveSite, updateAllSites]);

  // Удаление центра
  const handleDeleteSite = useCallback(async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this site?\nThis will also remove this site from all users.')) {
      return;
    }
    
    try {
      const deleted = await deleteRecord(Tables.SITE, id);
      if (deleted) {
        // Создаем объект для удаления из локального состояния
        const siteToDelete = allSites.find(site => site.id === id);
        if (siteToDelete) {
          updateAllSites(siteToDelete, 'delete');
        }
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Failed to delete site. Please try again.');
    }
  }, [allSites, updateAllSites]);

  // Генерация объекта структуры для предпросмотра
  useEffect(() => {
    setSiteObject(filteredSites);
    console.log('Current filtered sites:', filteredSites);
  }, [filteredSites]);

  // Сброс
  const handleReset = () => {
    if (window.confirm('Reset filters? This will clear the current view.')) {
      setCurrentStudyId(null);
      // Не сбрасываем allSites, так как это все центры из БД
    }
  };

  // Статистика
  const getStats = () => {
    const stats = {
      total: filteredSites?.length || 0,
      planned: filteredSites?.filter(s => s.status === SiteStatus.PLANNED).length || 0,
      opened: filteredSites?.filter(s => s.status === SiteStatus.OPENED).length || 0,
      closed: filteredSites?.filter(s => s.status === SiteStatus.CLOSED).length || 0,
    };
    
    return stats;
  };

  const stats = getStats();

  const studyHandler = (studyId: number | null) => {
    setCurrentStudyId(studyId);
    console.log('Selected study:', studyId);
  };

  const studyCountriesList = studies.find(study => study.id === currentStudyId)?.countries;

  const handleCountriesChange = (value: SelectorValue[]) => {
    const country = String(value);

    setNewSiteForm(prev => ({ ...prev, country: country }))
  };

  return (
    <div className="site-manager-container">
      <div className="site-manager-header">
        <h2>Sites Management</h2>
        <div className="controls">
          {/* <button 
            onClick={handleReset}
            className="action-button reset-button"
          >
            🔄 Reset Filter
          </button> */}
        </div>
      </div>

      <div className="edit-block">
        {/* Форма добавления нового центра */}
        <div className="add-site-form">
          <div className="site-form-grid">
            <label>Study*</label>
            <CustomSelect
              studies={studies}
              studyHandler={studyHandler}
            />

          <h3 style={{marginTop: '35px'}}>➕ New Study Site</h3>
            <label>Site name*</label>
            <input
              type="text"
              value={newSiteForm.name}
              onChange={(e) => setNewSiteForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Full institution name *"
              className="form-input"
              required
              disabled={!currentStudyId}
            />
            
            <label>Site number*</label>
            <input
              type="number"
              value={newSiteForm.number}
              onChange={(e) => setNewSiteForm(prev => ({ ...prev, number: e.target.value }))}
              placeholder="Site number in study*"
              className="form-input"
              min="1"
              required
              disabled={!currentStudyId}
            />
            
            <label>Principal Investigator*</label>
            <input
              type="text"
              value={newSiteForm.principal_investigator}
              onChange={(e) => setNewSiteForm(prev => ({ ...prev, principal_investigator: e.target.value }))}
              placeholder="Principal Investigator name *"
              className="form-input"
              required
              disabled={!currentStudyId}
            />

            <label>City*</label>
            <input
              type="text"
              value={newSiteForm.city}
              onChange={(e) => setNewSiteForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="City *"
              className="form-input"
              required
              disabled={!currentStudyId}
            />
            
            
            {/* <input
              type="text"
              value={newSiteForm.country}
              onChange={(e) => setNewSiteForm(prev => ({ ...prev, country: e.target.value }))}
              placeholder="Country *"
              className="form-input"
              required
              disabled={!currentStudyId}
            /> */}

            {studyCountriesList &&
              <>
                <label>Country*</label>
                <CountrySelector
                  selectedValues={[newSiteForm.country]}
                  onChange={handleCountriesChange}
                  placeholder="Select countries..."
                  availableOptions={studyCountriesList}
                />
              </>
            }
            
            <button 
              onClick={handleAddSite}
              className="add-button"
              disabled={!currentStudyId || !newSiteForm.name.trim() || !newSiteForm.number.trim() || 
                       !newSiteForm.city.trim()}
            >
              Add Site
            </button>
          </div>
        </div>

        {/* Список центров */}
        <div className="sites-list">
          <div className="list-header">
            <div className="header-index">#</div>
            <div className="header-details">Study Site Details</div>
            <div className="header-status">Status</div>
          </div>
          
          <div className="sites-list-items">
            {!currentStudyId ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Select a Study</h3>
                <p>Please select a study from the Study dropdown to view and manage sites</p>
              </div>
            ) : filteredSites.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3>No sites for this study</h3>
                <p>Add your first investigational site using the form on the left</p>
                <div className="study-info">
                  <span className="study-badge">Study ID: {currentStudyId}</span>
                </div>
              </div>
            ) : (
              filteredSites.map((site, index) => (
                <SiteItem
                  key={site.id}
                  site={site}
                  index={index}
                  onUpdate={handleUpdateSite}
                  onDelete={handleDeleteSite}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Статистика */}
      {currentStudyId && filteredSites.length > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Total Sites:</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Planned:</span>
            <span className="stat-value planned">{stats.planned}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Opened:</span>
            <span className="stat-value opened">{stats.opened}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Closed:</span>
            <span className="stat-value closed">{stats.closed}</span>
          </div>
        </div>
      )}
      
      <StructurePreview
        structure={siteObject}
      />
    </div>
  );
};

export default SiteManager;