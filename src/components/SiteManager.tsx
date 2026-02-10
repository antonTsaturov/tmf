'use client'
import { useState, useCallback, FC, ChangeEvent, KeyboardEvent, useEffect, useContext } from 'react';
import '../styles/SiteManager.css';
import { AdminContext } from '@/wrappers/AdminContext';
import { CustomSelect } from './Select';
import { StudySite, SiteStatus } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from './Preview';
import { useEntityState } from '@/hooks/useEntityState';
import { deleteRecord } from '@/lib/api/fetch';

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
  //const [tempStatus, setTempStatus] = useState(status);

  const statusConfig = {
    [SiteStatus.OPENED]: { label: 'Opened', color: '#51cf66', icon: '🟢' },
    [SiteStatus.PLANNED]: { label: 'Planned', color: '#ff922b', icon: '🟡' },
    [SiteStatus.CLOSED]: { label: 'Closed', color: '#ff6b6b', icon: '🔒' },
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
    principal_investigator: site.principal_investigator
  });

  const handleInputChange = (field: keyof StudySite) => (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.value.length > 0) {
      setEditData(prev => ({
        ...prev,
        [field]: e.target.value
      }));
    }

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
    if (!editData.city || !editData.city.trim() || !editData.country || !editData.country.trim()) {
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
      principal_investigator: site.principal_investigator
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
                  value={editData.name}
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
                  value={editData.city}
                  onChange={handleInputChange('city')}
                  placeholder="City *"
                  className="site-input"
                  required
                />
                <input
                  type="text"
                  value={editData.country}
                  onChange={handleInputChange('country')}
                  placeholder="Country *"
                  className="site-input"
                  required
                />
                <input
                  type="text"
                  value={editData.principal_investigator}
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

  const { studies, saveSite, loadTablePartial } = useContext(AdminContext)!;

  const { 
    entities: managedSites, 
    updateEntity: updateSite,
    addEntity: addSite,
    removeEntity: removeSite,
    setEntities: setManagedSites
  } = useEntityState<StudySite>([], async (site) => {
    // Функция сохранения в БД
    await saveSite(Tables.SITE, site);
  });
  
  const [currentStudyId, setCurrentStudyId] = useState<number | null>(null);
  
  const [siteObject, setSiteObject] = useState<StudySite[]>([]);
  const [newSiteForm, setNewSiteForm] = useState({
    name: '',
    number: '',
    city: '',
    principal_investigator: '',
    country: ''
  });

  // Добавление центра в конец списка
  const handleAddSite = useCallback(() => {
    if (!currentStudyId) {
      alert('Please select a study first');
      return;
    }

    if (!newSiteForm.name.trim()
        || !newSiteForm.number.trim()
        || !newSiteForm.city.trim()
        || !newSiteForm.country.trim()
        || !newSiteForm.principal_investigator.trim()
      ) {
      alert('Please fill all required fields: Institution Name, Number, City, PI name and Country.');
      return;
    }

    const newSite: StudySite = {
      id: generateId(currentStudyId),
      study_id: currentStudyId,
      name: newSiteForm.name.trim(),
      number: parseInt(newSiteForm.number) || 1,
      city: newSiteForm.city.trim(),
      principal_investigator: newSiteForm.principal_investigator.trim(),
      country: newSiteForm.country.trim(),
      status: SiteStatus.PLANNED
    };

    // Используем addSite из useEntityState вместо setSites
    addSite(newSite);
    
    setNewSiteForm({ 
      name: '', 
      number: '', 
      city: '', 
      country: '', 
      principal_investigator: '' 
    });
  }, [newSiteForm, currentStudyId, addSite]);

  // Обновление центра
  const handleUpdateSite = useCallback((id: number, updates: Partial<StudySite>) => {
    updateSite(id, updates);
  }, [updateSite]);

  // Удаление центра с использованием useEntityState
  const handleDeleteSite = useCallback(async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this site?')) {
      return;
    }
    
    const deleted = deleteRecord(Tables.SITE, id);
    if (await deleted) {
      removeSite(id);
    }
    
  }, [removeSite]);


  // Генерация объекта структуры
  useEffect(() => {
    const generateSiteObject = () => {
      setSiteObject(managedSites);
      
      console.log('Sites Structure:', managedSites);
    };
    generateSiteObject();
  }, [managedSites]);

  // Загрузка сайтов при изменении выбранного исследования
  useEffect(() => {
    const loadSitesForStudy = async () => {
      if (currentStudyId === null) {
        setManagedSites([]); // Очищаем сайты если исследование не выбрано
        return;
      }

      try {
        const loadedSites = await loadTablePartial(Tables.SITE, currentStudyId);
        // Приводим тип данных, если нужно
        const studySites = loadedSites as unknown as StudySite[];
        
        if (studySites && Array.isArray(studySites)) {
          setManagedSites(studySites);
        } else {
          setManagedSites([]);
        }
      } catch (error) {
        console.error('Error loading sites:', error);
        setManagedSites([]);
      }
    };

    loadSitesForStudy();
  }, [currentStudyId, loadTablePartial, setManagedSites]);

  // TODO: Экспорт списка центров в формате Excel
  const handleExportSites = () => {
    //const currentStudy = studies?.find(study => study.id === currentStudyId);
    if (!currentStudyId) {
      return;
    }
    // Добавляем обновленную структуру папок
    //currentStudy.sites_list = sites;
    // Сохраняем
    //console.log(sites)
    // const updates: StudySite = {
    //   id: currentStudyId,
    //   sites_list: sites
    // } as unknown as StudySite
    //console.log(sites)
    

    // const dataStr = JSON.stringify(sites, null, 2);
    // const dataBlob = new Blob([dataStr], { type: 'application/json' });
    // const url = URL.createObjectURL(dataBlob);
    
    // const link = document.createElement('a');
    // link.href = url;
    // link.download = `centers-${new Date().toISOString().split('T')[0]}.json`;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
    // URL.revokeObjectURL(url);
  };

  // TODO: Импорт списка из Excel
  const handleImportSites = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      
      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          if (!event.target?.result) return;
          
          const imported = JSON.parse(event.target.result as string) as StudySite[];
          
          // Валидация
          if (!Array.isArray(imported)) {
            throw new Error('Invalid format: expected array');
          }
          
          imported.forEach((site, index) => {
            if (!site.id || !site.name || typeof site.number !== 'number') {
              throw new Error(`Invalid site at index ${index}`);
            }
          });
          
          setManagedSites(imported);
          alert(`Successfully imported ${imported.length} centers`);
        } catch (error) {
          alert(`Import error: ${error instanceof Error ? error.message : 'Invalid file format'}`);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  // Сброс
  const handleReset = () => {
    if (window.confirm('Remove current sites list? All changes will be lost.')) {
      setManagedSites([]);
      setSiteObject([]);
    }
  };

  // Статистика
  const getStats = () => {
    const stats = {
      total: managedSites?.length,
      planned: managedSites?.filter(s => s.status === SiteStatus.PLANNED).length,
      opened: managedSites?.filter(s => s.status === SiteStatus.OPENED).length,
      closed: managedSites?.filter(s => s.status === SiteStatus.CLOSED).length,
    };
    
    return stats;
  };

  const stats = getStats();

  const studyHandler = (studyId: number | null) => {
    setCurrentStudyId(studyId);
    console.log(studyId)
  };

  return (
    <div className="site-manager-container">
      <div className="site-manager-header">
        <h2>Sites Management</h2>
        <div className="controls">
          {/* <button 
            onClick={handleExportSites}
            className="action-button export-button"
          >
            📋 Export in Excel
          </button>
          <button 
            onClick={handleImportSites}
            className="action-button import-button"
          >
            📥 Import from Excel
          </button> */}
          <button 
            onClick={handleReset}
            className="action-button reset-button"
          >
            🔄 Reset
          </button>
        </div>
      </div>
          {/* <select
            className="project-select"
            style={{ marginBottom: 8 }}
            // onChange={...} // Add handler if you want to store the selected value
            required
          >
            <option value="">Select a Project</option>
          </select> */}
          <div className="edit-block">
      {/* Форма добавления нового центра */}
      <div className="add-site-form">
        <h3>➕ New Study Site</h3>
        <div className="site-form-grid">
          <label>Study*</label>
          <CustomSelect
            studies={studies}
            studyHandler={studyHandler}
          />
          <label>Site name*</label>
          <input
            type="text"
            value={newSiteForm.name}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Full institution name *"
            className="form-input"
            required
            disabled={!currentStudyId ? true : false}
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
            disabled={!currentStudyId ? true : false}
          />
          <label>Principal Investigator*</label>
          <input
            type="text"
            value={newSiteForm.principal_investigator}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, principal_investigator: e.target.value }))}
            placeholder="Principal Investigator name *"
            className="form-input"
            required
            disabled={!currentStudyId ? true : false}
          />

          <label>City*</label>
          <input
            type="text"
            value={newSiteForm.city}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, city: e.target.value }))}
            placeholder="City *"
            className="form-input"
            required
            disabled={!currentStudyId ? true : false}
          />
          <label>Country*</label>
          <input
            type="text"
            value={newSiteForm.country}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, country: e.target.value }))}
            placeholder="Country *"
            className="form-input"
            required
            disabled={!currentStudyId ? true : false}
          />
          <button 
            onClick={handleAddSite}
            className="add-button"
            disabled={!newSiteForm.name.trim() || !newSiteForm.number.trim() || !newSiteForm.city.trim() || !newSiteForm.country.trim()}
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
            {managedSites?.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3>No sites yet</h3>
                <p>Add your first investigational site using the form</p>
              </div>
            ) : (
              managedSites.map((site, index) => (
                <SiteItem
                  key={site.id}
                  site={site}
                  index={index}
                  onUpdate={handleUpdateSite}
                  onDelete={handleDeleteSite}
                  //onMove={handleMoveSite}
                />
              ))
            )}
          </div>
        </div>

      </div>

      {/* Статистика */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Sites:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Planned:</span>
          <span className="stat-value active">{stats.planned}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Opened:</span>
          <span className="stat-value inactive">{stats.opened}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Closed:</span>
          <span className="stat-value locked">{stats.closed}</span>
        </div>
      </div>
      <StructurePreview
        structure={siteObject}
      />
    </div>
  );
};

export default SiteManager;