
import React, { useState, useCallback, FC, ChangeEvent, KeyboardEvent, useEffect } from 'react';
import '../styles/SiteManager.css';

// Enum для статусов
export enum SiteStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
  ARCHIVED = 'archived'
}

// Интерфейс центра
export interface Site {
  id: string;
  name: string;
  number: number;
  country: string;
  city: string;
  principalInvestigator: string;
  status: SiteStatus;
}

// Пропсы компонентов
interface StatusBadgeProps {
  status: SiteStatus;
  onChange?: (status: SiteStatus) => void;
  editable?: boolean;
}

interface SiteItemProps {
  site: Site;
  index: number;
  onUpdate: (id: string, updates: Partial<Site>) => void;
  onDelete: (id: string) => void;
  onMove?: (fromIndex: number, toIndex: number) => void;
}

interface SiteManagerProps {
  initialSites?: Site[];
}

// Утилитарные функции
const generateId = (): string => 
  `site-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createNewSite = (): Site => ({
  id: generateId(),
  name: 'New Site',
  number: Math.floor(Math.random() * 1000) + 1,
  country: 'Country',
  city: 'City',
  principalInvestigator: 'Investigator',
  status: SiteStatus.ACTIVE
});

// Компонент бейджа статуса
const StatusBadge: FC<StatusBadgeProps> = ({ status, onChange, editable = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempStatus, setTempStatus] = useState(status);

  const statusConfig = {
    [SiteStatus.ACTIVE]: { label: 'Active', color: '#51cf66', icon: '🟢' },
    [SiteStatus.INACTIVE]: { label: 'Inactive', color: '#ff922b', icon: '🟡' },
    [SiteStatus.LOCKED]: { label: 'Locked', color: '#ff6b6b', icon: '🔒' },
    [SiteStatus.ARCHIVED]: { label: 'Archived', color: '#868e96', icon: '📦' }
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
  const [editData, setEditData] = useState<Partial<Site>>({
    name: site.name,
    city: site.city,
    country: site.country
  });

  const handleInputChange = (field: keyof Site) => (
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
      country: site.country
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
                  placeholder="Number"
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
              </div>
            ) : (
              <div className="display-details">
                <h3 className="site-name">{site.name}</h3>
                <div className="site-meta">
                  <span className="site-number">#{site.number}</span>
                  <span className="site-location">
                    {site.city}, {site.country}
                  </span>
                </div>
              </div>
            )}
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
const SiteManager: FC<SiteManagerProps> = ({ initialSites }) => {
  const [sites, setSites] = useState<Site[]>(
    initialSites || [
      {
        id: generateId(),
        name: 'Main Medical Center',
        number: 101,
        country: 'USA',
        city: 'New York',
        principalInvestigator: 'Dr. Smith',
        status: SiteStatus.ACTIVE
      },
    ]
  );

  const [siteObject, setSiteObject] = useState<Site[]>([]);
  const [newSiteForm, setNewSiteForm] = useState({
    name: '',
    number: '',
    city: '',
    principalInvestigator: '',
    country: ''
  });

  // Добавление центра в конец списка
  const handleAddSite = useCallback(() => {
    if (!newSiteForm.name.trim()
        || !newSiteForm.number.trim()
        || !newSiteForm.city.trim()
        || !newSiteForm.country.trim()
        || !newSiteForm.principalInvestigator.trim()
      ) {
      alert('Please fill all required fields: Name, Number, City, PI and Country.');
      return;
    }

    const newSite: Site = {
      id: generateId(),
      name: newSiteForm.name.trim(),
      number: parseInt(newSiteForm.number) || 1,
      city: newSiteForm.city.trim(),
      principalInvestigator: newSiteForm.principalInvestigator.trim(),
      country: newSiteForm.country.trim(),
      status: SiteStatus.ACTIVE
    };

    setSites(prev => [...prev, newSite]);
    setNewSiteForm({ name: '', number: '', city: '', country: '', principalInvestigator: '' });
  }, [newSiteForm]);

  // Обновление центра
  const handleUpdateSite = useCallback((id: string, updates: Partial<Site>) => {
    setSites(prev => 
      prev.map(site => 
        site.id === id ? { ...site, ...updates } : site
      )
    );
  }, []);

  // Удаление центра
  const handleDeleteSite = useCallback((id: string) => {
    if (!window.confirm('Are you sure you want to delete this center?')) {
      return;
    }
    
    setSites(prev => prev.filter(site => site.id !== id));
  }, []);

  // Перемещение центра
  // const handleMoveSite = useCallback((fromIndex: number, toIndex: number) => {
  //   if (toIndex < 0 || toIndex >= sites.length) return;
    
  //   setSites(prev => {
  //     const newSites = [...prev];
  //     const [movedSite] = newSites.splice(fromIndex, 1);
  //     newSites.splice(toIndex, 0, movedSite);
  //     return newSites;
  //   });
  // }, [sites.length]);

  // Генерация объекта структуры
  useEffect(() => {
    const generateSiteObject = () => {
      setSiteObject(sites);
      
      console.log('Sites Structure:', sites);
      
      // navigator.clipboard.writeText(JSON.stringify(sites, null, 2))
      //   .then(() => alert('Site list copied to clipboard'))
      //   .catch(err => console.error('Copy error:', err));
    };
    generateSiteObject();
  }, [sites]);

  // Экспорт списка
  const handleExportSites = () => {
    const dataStr = JSON.stringify(sites, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `centers-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Импорт списка
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
          
          const imported = JSON.parse(event.target.result as string) as Site[];
          
          // Валидация
          if (!Array.isArray(imported)) {
            throw new Error('Invalid format: expected array');
          }
          
          imported.forEach((site, index) => {
            if (!site.id || !site.name || typeof site.number !== 'number') {
              throw new Error(`Invalid site at index ${index}`);
            }
          });
          
          setSites(imported);
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
    if (window.confirm('Reset to default centers? All changes will be lost.')) {
      setSites([
        {
          id: generateId(),
          name: 'Default Medical Center',
          number: 101,
          country: 'USA',
          city: 'New York',
          principalInvestigator: 'Dr. Smith',
          status: SiteStatus.ACTIVE
        },
      ]);
      setSiteObject([]);
    }
  };

  // Статистика
  const getStats = () => {
    const stats = {
      total: sites.length,
      active: sites.filter(s => s.status === SiteStatus.ACTIVE).length,
      inactive: sites.filter(s => s.status === SiteStatus.INACTIVE).length,
      locked: sites.filter(s => s.status === SiteStatus.LOCKED).length,
      archived: sites.filter(s => s.status === SiteStatus.ARCHIVED).length
    };
    
    return stats;
  };

  const stats = getStats();

  return (
    <div className="site-manager-container">
      <div className="site-manager-header">
        <h2>Sites Management</h2>
        <div className="controls">
          <button 
            onClick={handleExportSites}
            className="action-button export-button"
          >
            📋 Export Centers
          </button>
          <button 
            onClick={handleImportSites}
            className="action-button import-button"
          >
            📥 Import Centers
          </button>
          <button 
            onClick={handleReset}
            className="action-button reset-button"
          >
            🔄 Reset
          </button>
        </div>
      </div>
          <select
            className="project-select"
            style={{ marginBottom: 8 }}
            // onChange={...} // Add handler if you want to store the selected value
            required
          >
            <option value="">Select a Project</option>
          </select>
      {/* Форма добавления нового центра */}
      <div className="add-site-form">
        <h3>New Site</h3>
        <div className="form-grid">
          <input
            type="text"
            value={newSiteForm.name}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Center name *"
            className="form-input"
            required
          />
          <input
            type="number"
            value={newSiteForm.number}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, number: e.target.value }))}
            placeholder="Number *"
            className="form-input"
            min="1"
            required
          />
          <input
            type="text"
            value={newSiteForm.city}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, city: e.target.value }))}
            placeholder="City *"
            className="form-input"
            required
          />
          <input
            type="text"
            value={newSiteForm.country}
            onChange={(e) => setNewSiteForm(prev => ({ ...prev, country: e.target.value }))}
            placeholder="Country *"
            className="form-input"
            required
          />
          <button 
            onClick={handleAddSite}
            className="add-button"
            disabled={!newSiteForm.name.trim() || !newSiteForm.number.trim() || !newSiteForm.city.trim() || !newSiteForm.country.trim()}
          >
            ➕ New Site
          </button>
        </div>
      </div>


      <div className="edit-block">
        {/* Список центров */}
        <div className="sites-list">
          <div className="list-header">
            <div className="header-index">#</div>
            <div className="header-details">Site Details</div>
            <div className="header-status">Status</div>
          </div>
          
          {sites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>No centers yet</h3>
              <p>Add your first center using the form above</p>
            </div>
          ) : (
            sites.map((site, index) => (
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

        {/* Превью объекта */}
        <div className="sites-structure-preview">
          <div className="structure-header">
            <h3>Current Sites (JSON):</h3>
            <button 
              onClick={() => setSiteObject([])}
              className="clear-button"
            >
              Clear Preview
            </button>
          </div>
          {siteObject.length > 0 && (
            <pre className="json-preview">
              {JSON.stringify(siteObject, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Sites:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Active:</span>
          <span className="stat-value active">{stats.active}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Inactive:</span>
          <span className="stat-value inactive">{stats.inactive}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Locked:</span>
          <span className="stat-value locked">{stats.locked}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Archived:</span>
          <span className="stat-value archived">{stats.archived}</span>
        </div>
      </div>
    </div>
  );
};

export default SiteManager;