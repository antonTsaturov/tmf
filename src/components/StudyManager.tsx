// import { Metadata } from "next";

// enum StudyStatus {
//   PLANNED = 'planned',
//   ONGOING = 'ongoing',
//   COMPLETED = 'completed',
//   TERMINATED = 'terminated',
//   ARCHIVED = 'archived'
// }

// export enum UserRoles {
//     ADMIN = 'admin',
//     COORDINATOR = 'coordinator',
//     INVESTIGATOR = 'investigator',
//     MONITOR = 'monitor',
//     DATA_MANAGER = 'data_manager',
//     AUDITOR = 'auditor',
//     PROJECT_MANAGER = 'project_manager'
// }

// export enum FileAction {
//     UPLOADED = 'uploaded',
//     APPROVED = 'approved',
//     DISAPPROVED = 'disapproved',
//     UPDATED = 'updated',
//     DELETED = 'deleted',
//     ARCHIVED = 'archived',
//     RESTORED = 'restored'
// }

// interface AuditTrail {
//     id: number;
//     action: FileAction;
//     performedBy: string;
//     timestamp: string;
//     details: string;
// }

// export interface StudyDocument {
//     id: number;
//     name: string;
//     type: string;
//     url: string;
//     status: 'active' | 'archived' | 'deleted';
//     metadata: Metadata[];
//     language: string;
//     auditTrail: AuditTrail[];
// }

// export interface StudyUsers {
//   id: number;
//   name: string;
//   role: UserRoles;
//   email: string;
// }

// interface Study {
//   id: number;
//   title: string;
//   protocol: string;
//   sponsor: string;
//   cro: string;
//   countries: string[];
//   status: StudyStatus;
//   documents: StudyDocument[] | null;
//   users: StudyUsers[] | null;
//   auditTrail: AuditTrail[];
// }

import { useState, useCallback, FC, ChangeEvent, KeyboardEvent, useEffect, useContext } from 'react';
import '../styles/StudyManager.css';
import { Study, StudyStatus } from '@/types/types';
import { deleteRecord } from '@/lib/api/fetch';
import { AdminContext } from '@/wrappers/AdminContext';
import { Tables } from '@/lib/db/schema';


// Enum для статусов исследования
// export enum StudyStatus {
//   PLANNED = 'planned',
//   ONGOING = 'ongoing',
//   COMPLETED = 'completed',
//   TERMINATED = 'terminated',
//   ARCHIVED = 'archived'
// }

// Дополнительные интерфейсы
export interface StudyDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: Date;
}

export interface StudyUser {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface AuditTrail {
  id: string;
  action: string;
  userId: string;
  timestamp: Date;
  details: string;
}

// Пропсы компонентов
interface StatusBadgeProps {
  status: StudyStatus;
  onChange?: (status: StudyStatus) => void;
  editable?: boolean;
}

interface StudyItemProps {
  study: Study;
  index: number;
  onUpdate: (id: number, updates: Partial<Study>) => void;
  onDelete: (id: number) => void;
}

interface CountrySelectorProps {
  countries: string[];
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
}

interface StudyManagerProps {
  initialStudies?: Study[];
}

// Утилитарные функции
const generateStudyId = (): number => Math.floor(Math.random() * 9000) + 1000;

// const createNewStudy = (): Study => ({
//   id: generateStudyId(),
//   title: 'New Clinical Study',
//   protocol: `PROT-${Math.floor(Math.random() * 9000) + 1000}`,
//   sponsor: 'Pharmaceutical Company',
//   cro: 'CRO Organization',
//   countries: ['USA'],
//   status: StudyStatus.PLANNED,
//   total_documents: null,
//   users: null,
// });

// Список доступных стран
const COUNTRIES_LIST = [
  'Russia', 'Australia', 'China', 'India', 'Brazil', 'Mexico', 'South Korea', 'USA'
];

// Компонент бейджа статуса
const StatusBadge: FC<StatusBadgeProps> = ({ status, onChange, editable = false }) => {
  const [isEditing, setIsEditing] = useState(false);

  const statusConfig = {
    [StudyStatus.PLANNED]: { label: 'Planned', color: '#74c0fc', icon: '📅' },
    [StudyStatus.ONGOING]: { label: 'Ongoing', color: '#51cf66', icon: '⚡' },
    [StudyStatus.COMPLETED]: { label: 'Completed', color: '#868e96', icon: '✅' },
    [StudyStatus.TERMINATED]: { label: 'Terminated', color: '#ff6b6b', icon: '❌' },
    [StudyStatus.ARCHIVED]: { label: 'Archived', color: '#9775fa', icon: '📦' }
  };

  const config = statusConfig[status];

  const handleStatusChange = (newStatus: StudyStatus) => {
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
            onClick={() => handleStatusChange(statusKey as StudyStatus)}
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

// Компонент выбора стран
const CountrySelector: FC<CountrySelectorProps> = ({ 
  countries, 
  selectedCountries, 
  onChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const toggleCountry = (country: string) => {
    const newCountries = selectedCountries.includes(country)
      ? selectedCountries.filter(c => c !== country)
      : [...selectedCountries, country];
    onChange(newCountries);
  };

  const filteredCountries = countries.filter(country =>
    country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="country-selector">
      <div 
        className="selected-countries"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedCountries.length > 0 ? (
          selectedCountries.map(country => (
            <span key={country} className="country-tag">
              {country}
            </span>
          ))
        ) : (
          <span className="placeholder">Select countries...</span>
        )}
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div className="country-dropdown">
          <input
            type="text"
            placeholder="Search countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="country-search"
          />
          <div className="country-list">
            {filteredCountries.map(country => (
              <div
                key={country}
                className={`country-item ${selectedCountries.includes(country) ? 'selected' : ''}`}
                onClick={() => toggleCountry(country)}
              >
                <span className="country-checkbox">
                  {selectedCountries.includes(country) ? '✓' : ''}
                </span>
                {country}
              </div>
            ))}
          </div>
          <div className="country-actions">
            <button onClick={() => onChange(COUNTRIES_LIST)}>
              Select All
            </button>
            <button onClick={() => onChange([])}>
              Clear All
            </button>
            <button onClick={() => setIsOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const handleCountriesChange = (countries: string[]) => {
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
    <div 
      className="study-item"
      style={{ animationDelay: `${index * 0.05}s` }}
      onKeyDown={handleKeyDown}
      data-testid={`study-${study.id}`}
    >
      <div className="study-item-first-row">
        <div className="study-item-first-row-left-block">
          <div className="study-index">
            <span className="index-number">{index + 1}</span>
            <div className="study-id">
              ID: {study.id}
            </div>
          </div>

          <div className="study-details">
            {isEditing ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editData.title}
                  onChange={handleInputChange('title')}
                  placeholder="Study Title"
                  className="study-input"
                  autoFocus
                />
                <input
                  type="text"
                  value={editData.protocol}
                  onChange={handleInputChange('protocol')}
                  placeholder="Protocol Number"
                  className="study-input"
                />
                <input
                  type="text"
                  value={editData.sponsor}
                  onChange={handleInputChange('sponsor')}
                  placeholder="Sponsor"
                  className="study-input"
                />
                <input
                  type="text"
                  value={editData.cro}
                  onChange={handleInputChange('cro')}
                  placeholder="CRO Organization"
                  className="study-input"
                />
                <CountrySelector
                  countries={COUNTRIES_LIST}
                  selectedCountries={editData.countries || study.countries}
                  onChange={handleCountriesChange}
                />
              </div>
            ) : (
              <div className="display-details">
                <div className="study-header">
                  <h3 className="study-title">{study.title}</h3>
                  <span className="study-protocol">{study.protocol}</span>
                </div>
                <div className="study-meta">
                  <div className="meta-item">
                    <span className="meta-label">Sponsor:</span>
                    <span className="meta-value">{study.sponsor}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">CRO:</span>
                    <span className="meta-value">{study.cro}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Countries:</span>
                    <span className="meta-value">
                      {study.countries.slice(0, 3).join(', ')}
                      {study.countries.length > 3 && ` +${study.countries.length - 3} more`}
                    </span>
                  </div>
                </div>
                <div className="study-stats">
                  <div className="stat-badge">
                    <span className="stat-icon">📄</span>
                    <span className="stat-count">{stats.documents}</span>
                    <span className="stat-label">Docs</span>
                  </div>
                  <div className="stat-badge">
                    <span className="stat-icon">👥</span>
                    <span className="stat-count">{stats.users}</span>
                    <span className="stat-label">Users</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="study-status">
          <StatusBadge 
            status={study.status}
            onChange={(newStatus) => onUpdate(study.id, { status: newStatus })}
            editable={!isEditing}
          />
        </div>
      </div>
      
      <div className="study-item-second-row">
        <div className="study-actions">
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
                title="Edit study"
              >
                ✏️ Edit
              </button>
              <button 
                onClick={() => onDelete(study.id)}
                className="action-button delete-button"
                title="Delete study"
              >
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Основной компонент
const StudyManager: FC<StudyManagerProps> = () => {

  const { studies, setStudies, loadTable, error, saveStudy } = useContext(AdminContext)!;

  useEffect(() => {
    loadTable();
  }, []);

  const [studyObject, setStudyObject] = useState<Study[]>([]);
  const [newStudyForm, setNewStudyForm] = useState({
    title: '',
    protocol: '',
    sponsor: '',
    cro: '',
    countries: [] as string[]
  });

  // Добавление исследования в конец списка
  const handleAddStudy = useCallback(() => {
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
    saveStudy(Tables.STUDY, newStudy);
    // Update local state
    setStudies(prev => [...prev, newStudy]);
    
    console.log('Added new study:', newStudy);
    // Clear form
    setNewStudyForm({ title: '', protocol: '', sponsor: '', cro: '', countries: [] });
  }, [newStudyForm]);

  // Создание и обновление исследования
  // const handleUpdateStudy = useCallback((id: number, updates: Partial<Study>) => {
  //   setStudies(prev => 
  //     prev.map(study => 
  //       study.id === id 
  //         ? { 
  //             ...study, 
  //             ...updates,
  //           } 
  //         : study
  //     )
  //   );
  // }, []);

const handleUpdateStudy = useCallback((id: number, updates: Partial<Study>) => {
  setStudies(prev => {
    // Находим индекс обновляемого исследования
    const studyIndex = prev.findIndex(study => study.id === id);
    
    if (studyIndex === -1) {
      console.warn(`Study with id ${id} not found in state`);
      return prev;
    }
    
    const currentStudy = prev[studyIndex];
    
    // Создаем отдельный объект обновленного исследования
    const updatedStudy: Study = {
      ...currentStudy,
      ...updates,
    };
    
      // Сохраняем изменения в БД (асинхронно, не блокируя UI)
    saveStudy(Tables.STUDY, updatedStudy).catch(err => {
      console.error('Failed to save study updates:', err);
      // Optionally, we could revert the local state change here if saving fails
    });
    // Создаем копию массива и заменяем элемент
    const newStudies = [...prev];
    newStudies[studyIndex] = updatedStudy;
    
    // Логируем изменения (опционально, для отладки)
    // console.log('Study updated:', {
    //   id,
    //   previous: currentStudy,
    //   updates,
    //   result: updatedStudy,
    //   changedFields: Object.keys(updates).filter(key => 
    //     JSON.stringify(currentStudy[key as keyof Study]) !== JSON.stringify(updates[key as keyof typeof updates])
    //   ),
    // });
    
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
      
      //console.log('Studies Structure:', studies);
      
      // navigator.clipboard.writeText(JSON.stringify(studies, null, 2))
      //   .then(() => alert('Study list copied to clipboard'))
      //   .catch(err => console.error('Copy error:', err));
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
    <div className="study-manager-container">
      <div className="study-manager-header">
        <h2>Clinical Trials Management</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px' }}>
      {/* Форма добавления нового исследования */}
      <div className="add-study-form">
        <h3>➕ Add New Clinical Study</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Study Title *</label>
            <input
              type="text"
              value={newStudyForm.title}
              onChange={(e) => setNewStudyForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Phase III Oncology Trial"
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Protocol Number *</label>
            <input
              type="text"
              value={newStudyForm.protocol}
              onChange={(e) => setNewStudyForm(prev => ({ ...prev, protocol: e.target.value }))}
              placeholder="e.g., PROT-2024-001"
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label>Sponsor</label>
            <input
              type="text"
              value={newStudyForm.sponsor}
              onChange={(e) => setNewStudyForm(prev => ({ ...prev, sponsor: e.target.value }))}
              placeholder="Pharmaceutical company"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>CRO Organization</label>
            <input
              type="text"
              value={newStudyForm.cro}
              onChange={(e) => setNewStudyForm(prev => ({ ...prev, cro: e.target.value }))}
              placeholder="Clinical Research Organization"
              className="form-input"
            />
          </div>
          <div className="form-group full-width">
            <label>Countries</label>
            <CountrySelector
              countries={COUNTRIES_LIST}
              selectedCountries={newStudyForm.countries}
              onChange={(countries) => setNewStudyForm(prev => ({ ...prev, countries }))}
            />
          </div>
          <button 
            onClick={handleAddStudy}
            className="add-button"
            disabled={!newStudyForm.title.trim() || !newStudyForm.protocol.trim()}
          >
            Create Study
          </button>
        </div>
        <p className="form-hint">* Required fields</p>
      </div>

      

      {/* Список исследований */}
      <div className="studies-list">
        <div className="list-header">
          <div className="header-index">#</div>
          <div className="header-details">Study Details</div>
          <div className="header-status">Status</div>
        </div>
        
        {studies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔬</div>
            <h3>No clinical studies yet</h3>
            <p>Create your first study using the form above</p>
          </div>
        ) : (
          studies.map((study, index) => (
            <StudyItem
              key={study.id}
              study={study}
              index={index}
              onUpdate={handleUpdateStudy}
              onDelete={handleDeleteStudy}
            />
          ))
        )}
      </div>

      </div>

      {/* Статистика */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Studies:</span>
          <span className="stat-value total">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Planned:</span>
          <span className="stat-value planned">{stats.planned}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Ongoing:</span>
          <span className="stat-value ongoing">{stats.ongoing}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Completed:</span>
          <span className="stat-value completed">{stats.completed}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Terminated:</span>
          <span className="stat-value terminated">{stats.terminated}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Archived:</span>
          <span className="stat-value archived">{stats.archived}</span>
        </div>
      </div>

      {/* Превью объекта */}
      <div className="structure-preview">
        <div className="structure-header">
          <h3>Current Studies (JSON):</h3>
          <button 
            onClick={() => setStudyObject([])}
            className="clear-button"
          >
            Clear Preview
          </button>
        </div>
        {studyObject.length > 0 && (
          <pre className="json-preview">
            {JSON.stringify(studyObject, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default StudyManager;