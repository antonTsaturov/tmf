import React, { useState, useCallback, FC, KeyboardEvent, ChangeEvent, useEffect, useContext } from 'react';
import '../styles/ProjectBuilder.css';
import { v4 as uuidv4 } from 'uuid';
import { CustomSelect } from './Select'
import { AdminContext } from '@/wrappers/AdminContext';
import { FolderType, FolderStatus, FolderViewLevel, Folder } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from './Preview';
import { IoIosArrowDroprightCircle, IoIosArrowDropdownCircle } from "react-icons/io";

export interface FolderPosition {
  folder: Folder;
  parent: Folder | null;
}

// Пропсы для компонентов
interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

interface FolderItemProps {
  folder: Folder & { shouldEdit?: boolean };
  depth?: number;
  onAddFolder: (folderId: string, position: 'before' | 'after') => void;
  onAddSubfolder: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onUpdateName: (folderId: string, newName: string) => void;
  onEditComplete?: (folderId: string) => void;
  parentLevel?: FolderViewLevel; // Добавляем уровень родителя
}

interface FolderTreeProps {
  initialStructure?: Folder;
}

export const generateId = (level: FolderViewLevel): string => `${level}-${uuidv4()}`;

//export const generateSiteId = (): string => `site-${uuidv4()}`;

export const createNewFolder = (
  name: string = '', 
  type: FolderType = FolderType.FOLDER,
  shouldEdit: boolean = false,
  level: FolderViewLevel = FolderViewLevel.GENERAL, // По умолчанию GENERAL
  parentLevel?: FolderViewLevel // Уровень родителя
): Folder & { shouldEdit?: boolean } => {
  // Определяем уровень для новой папки
  let folderLevel = level;
  
  // Если есть родительский уровень, наследуем его
  if (parentLevel !== undefined) {
    folderLevel = parentLevel;
  }
  
  // Для корневых папок Site Level используем специальный формат id
  // const id = (type === FolderType.ROOT && folderLevel === FolderViewLevel.SITE) 
  //   ? generateSiteId() 
  //   : generateId();
  const id = generateId(folderLevel);
  
  return {
    id,
    name,
    type,
    level: folderLevel,
    status: FolderStatus.ACTIVE,
    children: [],
    shouldEdit
  };
};

// Создание начальной структуры с двумя корневыми папками
export const createInitialStructure = (studyName: string = 'Root Directory'): Folder => {
  const rootId = generateId(FolderViewLevel.ROOT);
  
  return {
    id: rootId,
    name: studyName,
    type: FolderType.ROOT,
    level: FolderViewLevel.GENERAL, // Корень не имеет уровня
    status: FolderStatus.ACTIVE,
    shouldEdit: false,
    children: [
      {
        id: generateId(FolderViewLevel.SITE), // Специальный id для Site Level
        name: 'Site Level',
        type: FolderType.FOLDER,
        level: FolderViewLevel.SITE,
        status: FolderStatus.ACTIVE,
        children: [],
        shouldEdit: false
      },
      {
        id: generateId(FolderViewLevel.GENERAL),
        name: 'General',
        type: FolderType.FOLDER,
        level: FolderViewLevel.GENERAL,
        status: FolderStatus.ACTIVE,
        children: [],
        shouldEdit: false
      }
    ]
  };
};

// Вспомогательный компонент для кнопок действий
const ActionButton: FC<ActionButtonProps> = ({ onClick, children, className = '' }) => (
  <button 
    onClick={onClick}
    className={`action-button ${className}`}
    title={typeof children === 'string' ? children : undefined}
  >
    {children}
  </button>
);

// Компонент папки
const FolderItem: FC<FolderItemProps> = ({ 
  folder, 
  depth = 0, 
  onAddFolder, 
  onAddSubfolder, 
  onDelete,
  onUpdateName,
  onEditComplete,
  parentLevel
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(folder.shouldEdit || false);
  const [editingName, setEditingName] = useState<string>(folder?.name);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Определяем уровень папки (наследуем от родителя если свой не задан)
  const folderLevel = folder.level !== undefined ? folder.level : parentLevel;

  const handleNameSave = (): void => {
    if (editingName.trim()) {
      onUpdateName(folder.id, editingName.trim());
    }
    setIsEditing(false);
    onEditComplete?.(folder.id);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditingName(folder.name);
      onEditComplete?.(folder.id);
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEditingName(e.target.value);
  };

  // Определяем иконку в зависимости от уровня
  const getFolderIcon = () => {
    if (folder.type === FolderType.ROOT) return '🏠';
    
    if (folderLevel === FolderViewLevel.SITE || folderLevel === FolderViewLevel.GENERAL) {
      return folder.children.length > 0 ? (isExpanded ? '📂' : '📁') : '📁';
    }
    
    return folder.children.length > 0 ? (isExpanded ? '📂' : '📁') : '📁';
  };

  // Получаем цвет фона в зависимости от уровня
  const getFolderBackground = () => {
    if (folderLevel === FolderViewLevel.SITE) {
      return 'rgba(85, 139, 47, 0.1)'; // Светло-зеленый для Site Level
    } else if (folderLevel === FolderViewLevel.GENERAL) {
      return 'rgba(25, 118, 210, 0.1)'; // Светло-синий для General
    }
    return 'transparent';
  };

  return (
    <div 
      className={`folder-item ${folder.type}`}
      data-testid={`${folder.id}`}
      style={{ backgroundColor: getFolderBackground(), padding: '5px' }}
    >
      <div className="folder-header">
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'flex-start'}}>
        {folder.children.length > 0 && (
          <button 
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? <IoIosArrowDropdownCircle /> : <IoIosArrowDroprightCircle />}
          </button>
        )}
        
        <div className="folder-icon" aria-hidden="true">
          {getFolderIcon()}
        </div>
        
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={handleNameChange}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="folder-name-input"
            aria-label="Edit folder name"
          />
        ) : ( <>
          <span 
            className="folder-name"
            onDoubleClick={() => setIsEditing(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
            aria-label={`Folder: ${folder.name}. Double click to edit`}
          >
            {folder.name}
            

          </span>
            {folderLevel !== undefined && folder.type !== FolderType.ROOT && (
              <span className={`level-badge ${folderLevel === FolderViewLevel.SITE ? 'site' : 'general'}`}>
                {folderLevel === FolderViewLevel.SITE ? 'SL' : 'G'}
              </span>
            )}
          </>
        )}
        </div>
        
        <div className="folder-actions">
          {folder.type !== FolderType.ROOT  && (
            <>
              {/* <ActionButton onClick={() => onAddFolder(folder.id, 'before')}>
                + Before
              </ActionButton>
              <ActionButton onClick={() => onAddFolder(folder.id, 'after')}>
                + After
              </ActionButton> */}
              <ActionButton onClick={() => onAddSubfolder(folder.id)}>
                + Sub
              </ActionButton>
              <ActionButton 
                onClick={() => onDelete(folder.id)}
                className="delete-button"
              >
                Delete
              </ActionButton>
            </>
          )}
        </div>
      </div>
      
      {isExpanded && folder.children.length > 0 && (
        <div className="folder-children">
          {folder.children.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              onAddFolder={onAddFolder}
              onAddSubfolder={onAddSubfolder}
              onDelete={onDelete}
              onUpdateName={onUpdateName}
              onEditComplete={onEditComplete}
              parentLevel={folderLevel} // Передаем свой уровень как родительский для детей
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Основной компонент
const FoldersStructureManager: FC<FolderTreeProps> = () => {
  const { studies, saveStudy } = useContext(AdminContext)!;
  const [currentStudyId, setCurrentStudyId] = useState<number | null>(null);
  const [rootFolder, setRootFolder] = useState<Folder | null>(null);
  const [structureObject, setStructureObject] = useState<Folder>({} as Folder);

  // Поиск папки в дереве
  const findFolderInTree = useCallback((folderId: string, tree?: Folder): FolderPosition | null => {
    const searchTree = tree || rootFolder;
    if (!searchTree) return null;
    if (searchTree.id === folderId) return { folder: searchTree, parent: null };
    
    const searchInChildren = (children: Folder[], parent: Folder): FolderPosition | null => {
      for (let child of children) {
        if (child.id === folderId) {
          return { folder: child, parent };
        }
        if (child.children && child.children.length > 0) {
          const result = searchInChildren(child.children, child);
          if (result) return result;
        }
      }
      return null;
    };
    
    return searchInChildren(searchTree.children, searchTree);
  }, [rootFolder]);

  // Тип для функции обновления дерева
  type TreeUpdater = (tree: Folder) => void;

  // Обновление дерева
  const updateTree = useCallback((updater: TreeUpdater) => {
    setRootFolder(prev => {
      if (!prev) return prev;
      const newTree = JSON.parse(JSON.stringify(prev)) as Folder;
      updater(newTree);
      return newTree;
    });
  }, []);

  // Добавление папки
  const handleAddFolder = useCallback((targetFolderId: string, position: 'before' | 'after' = 'after') => {
    updateTree((tree: Folder) => {
      const result = findFolderInTree(targetFolderId, tree);
      if (!result) return;

      const { folder, parent } = result;
      const parentArray = parent ? parent.children : tree.children;
      
      // Определяем уровень для новой папки (наследуем от целевой папки)
      const targetLevel = folder.level;
      
      const newFolder = createNewFolder(
        '', 
        parent?.type,
        //FolderType.FOLDER, 
        true,
        targetLevel // Используем уровень целевой папки
      );

      const targetIndex = parentArray.findIndex(f => f.id === folder.id);
      
      switch(position) {
        case 'before':
          parentArray.splice(targetIndex, 0, newFolder);
          break;
        case 'after':
          parentArray.splice(targetIndex + 1, 0, newFolder);
          break;
        default:
          parentArray.push(newFolder);
      }
    });
  }, [updateTree, findFolderInTree]);

  // Добавление подпапки
  const handleAddSubfolder = useCallback((parentFolderId: string) => {
    updateTree((tree: Folder) => {
      const result = findFolderInTree(parentFolderId, tree);
      if (!result) return;

      const { folder } = result;
      
      // Новая подпапка наследует уровень родителя
      const newSubfolder = createNewFolder(
        '', 
        FolderType.SUBFOLDER, 
        true,
        folder.level // Наследуем уровень родителя
      );
      
      if (!folder.children) {
        folder.children = [];
      }
      folder.children.push(newSubfolder);
    });
  }, [updateTree, findFolderInTree]);

  // Удаление папки
  const handleDeleteFolder = useCallback((folderId: string) => {
    // Запрещаем удаление корневых папок Site Level и General
    const result = findFolderInTree(folderId);
    if (result?.folder.name === 'Site Level' || result?.folder.name === 'General') {
      alert('Cannot delete root level folders (Site Level and General)');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this folder and all its contents?')) {
      return;
    }
    
    updateTree((tree: Folder) => {
      const result = findFolderInTree(folderId, tree);
      if (!result) return;

      const { folder, parent } = result;
      const parentArray = parent ? parent.children : tree.children;
      
      const index = parentArray.findIndex(f => f.id === folder.id);
      if (index !== -1) {
        parentArray.splice(index, 1);
      }
    });
  }, [updateTree, findFolderInTree]);

  // Обновление имени папки
  const handleUpdateName = useCallback((folderId: string, newName: string) => {
    updateTree((tree: Folder) => {
      const result = findFolderInTree(folderId, tree);
      if (!result) return;

      const { folder } = result;
      
      // Запрещаем переименование корневых папок Site Level и General
      if (folder.name === 'Site Level' || folder.name === 'General') {
        alert('Cannot rename root level folders');
        return;
      }
      
      folder.name = newName;
    });
  }, [updateTree, findFolderInTree]);

  // Очистка флага редактирования
  const handleEditComplete = useCallback((folderId: string) => {
    updateTree((tree: Folder) => {
      const result = findFolderInTree(folderId, tree);
      if (!result) return;
      const { folder } = result;
      delete (folder as any).shouldEdit;
    });
  }, [updateTree, findFolderInTree]);

  // Генерация структуры JSON
  useEffect(() => {
    const buildObject = (folder: Folder): Folder => {
      const obj: Folder = {
        name: folder.name,
        type: folder.type,
        id: folder.id,
        level: folder.level,
        status: folder.status,
        shouldEdit: folder.shouldEdit,
        children: [],
      };
      if (folder.children && folder.children.length > 0) {
        obj.children = folder.children.map(buildObject);
      }
      return obj;
    };
    
    const structure = rootFolder ? buildObject(rootFolder) : ({} as Folder);
    setStructureObject(structure);
  }, [rootFolder]);

  // Экспорт структуры в БД
  const handleExportStructure = (): void => {
    const currentStudy = studies?.find(study => study.id === currentStudyId);
    if (!currentStudy) {
      alert('Please select a study first');
      return;
    }
    
    currentStudy.folders_structure = rootFolder;
    saveStudy(Tables.STUDY, currentStudy);
    alert('Folder structure saved successfully!');
  };

  // Импорт структуры
  const handleImportStructure = (): void => {
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
          
          const imported = JSON.parse(event.target.result as string) as Folder;
          
          // Валидация структуры
          if (!imported.id || !imported.name || !imported.type || !Array.isArray(imported.children)) {
            throw new Error('Invalid folder structure format');
          }
          
          setRootFolder(imported);
          alert('Folder structure successfully imported!');
        } catch (error) {
          alert(`Import error: ${error instanceof Error ? error.message : 'Invalid file format'}`);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  // Сброс к начальному состоянию
  const handleReset = (): void => {
    if (window.confirm('Reset to last saved structure? All actual changes will be lost.')) {
      const currentStudy = studies?.find(study => study.id === currentStudyId);
      if (!currentStudy) {
        return;
      }

      setRootFolder(currentStudy.folders_structure);
      setStructureObject({} as Folder);
    }
  };

  // При смене studyId сбрасываем rootFolder
  const studyHandler = (studyId: number | null) => {
    setCurrentStudyId(studyId);
  };

  useEffect(() => {
    if (currentStudyId == null) {
      setRootFolder(null);
      setStructureObject({} as Folder);
      return;
    }

    const currentStudyFoldersStructure = studies?.find(study => study.id === currentStudyId)?.folders_structure;
    let folderStructure: Folder;
    
    if (currentStudyFoldersStructure && typeof currentStudyFoldersStructure === 'object' && !Array.isArray(currentStudyFoldersStructure)) {
      folderStructure = currentStudyFoldersStructure as Folder;
    } else {
      // Создаем начальную структуру с Site Level и General
      const studyName = studies?.find(study => study.id === currentStudyId)?.protocol || 'Root Directory';
      folderStructure = createInitialStructure(studyName);
    }
    
    setRootFolder(folderStructure);
    setStructureObject({} as Folder);
  }, [currentStudyId, studies]);

  return (
    <div className="folder-tree-container">
      <div className="folder-tree-header">
        <h2>Study Folders Structure Management</h2>
        <div className="controls">
          <ActionButton onClick={handleExportStructure}>
            📋 Write
          </ActionButton>
          <ActionButton onClick={handleImportStructure}>
            📥 Import
          </ActionButton>
          <ActionButton onClick={handleReset} className="reset-button">
            🔄 Reset
          </ActionButton>
        </div>
      </div>
      
      <CustomSelect
        studies={studies}
        studyHandler={studyHandler}
      />

      <div className="folder-tree-content">
        {rootFolder ? (
          <>
            <div className="folder-tree" role="tree" aria-label="Folder tree">
              <FolderItem
                folder={rootFolder}
                onAddFolder={handleAddFolder}
                onAddSubfolder={handleAddSubfolder}
                onDelete={handleDeleteFolder}
                onUpdateName={handleUpdateName}
                onEditComplete={handleEditComplete}
              />
            </div>
          </>
        ) : (
          <div className="empty-window" style={{ minHeight: 200, textAlign: 'center', padding: '2rem', color: '#888' }}>
            <p>No study selected. Please select a study to view or edit its folder structure.</p>
          </div>
        )}
        <StructurePreview structure={[structureObject]} />
      </div>
      
      {rootFolder && (
        <div className="stats">
          <p>
            Project name: <strong>{rootFolder.name}</strong> |
            Total folders: <strong>{countFolders(rootFolder)}</strong> | 
            Site Level folders: <strong>{countFoldersByLevel(rootFolder, FolderViewLevel.SITE)}</strong> |
            General folders: <strong>{countFoldersByLevel(rootFolder, FolderViewLevel.GENERAL)}</strong> |
            Depth: <strong>{getTreeDepth(rootFolder)}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

// Вспомогательные функции
const countFolders = (folder: Folder): number => {
  let count = 1;
  folder.children.forEach(child => {
    count += countFolders(child);
  });
  return count;
};

const countFoldersByLevel = (folder: Folder, level: FolderViewLevel): number => {
  let count = folder.level === level ? 1 : 0;
  folder.children.forEach(child => {
    count += countFoldersByLevel(child, level);
  });
  return count;
};

const getTreeDepth = (folder: Folder): number => {
  if (folder.children.length === 0) return 1;
  
  let maxDepth = 0;
  folder.children.forEach(child => {
    const childDepth = getTreeDepth(child);
    if (childDepth > maxDepth) {
      maxDepth = childDepth;
    }
  });
  
  return maxDepth + 1;
};

export default FoldersStructureManager;