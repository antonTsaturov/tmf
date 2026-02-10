import React, { useState, useCallback, FC, KeyboardEvent, ChangeEvent, useEffect, useContext } from 'react';
import '../styles/ProjectBuilder.css';
import { v4 as uuidv4 } from 'uuid';
import { CustomSelect } from './Select'
import { AdminContext } from '@/wrappers/AdminContext';
import { FolderType, FolderStatus, Folder } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from './Preview';

// Типы для структуры папок
// export enum FolderType {
//   ROOT = 'root',
//   FOLDER = 'folder',
//   SUBFOLDER = 'subfolder'
// }

// export enum FolderStatus {
//   ACTIVE = 'active',
//   LOCKED = 'locked',
//   ARCHIVED = 'archived'
// }


// export interface Folder {
//   id: string;
//   name: string;
//   type: FolderType;
//   status: FolderStatus;
//   children: Folder[];
// } 

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
  folder: Folder;
  depth?: number;
  onAddFolder: (folderId: string, position: 'before' | 'after') => void;
  onAddSubfolder: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onUpdateName: (folderId: string, newName: string) => void;
}

interface FolderTreeProps {
  initialStructure?: Folder;
}



export const generateId = (): string => `folder-${uuidv4()}`;

export const createNewFolder = (name: string = 'New Folder', type: FolderType = FolderType.FOLDER): Folder => ({
  id: generateId(),
  name,
  type,
  status: FolderStatus.ACTIVE,
  children: [],
});

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
  onUpdateName
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingName, setEditingName] = useState<string>(folder?.name);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const handleNameSave = (): void => {
    if (editingName.trim()) {
      onUpdateName(folder.id, editingName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditingName(folder.name);
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEditingName(e.target.value);
  };

  return (
    <div 
      className={`folder-item ${folder.type}`}
      data-testid={`${folder.id}`}
    >
      <div className="folder-header">
        {folder.children.length > 0 && (
          <button 
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        
        <div className="folder-icon" aria-hidden="true">
          {folder.type === FolderType.ROOT ? '🏠' : 
           folder.children.length > 0 ? (isExpanded ? '📂' : '📁') : '📁'}
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
        ) : (
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
        )}
        
        <div className="folder-actions">
          {folder.type !== FolderType.ROOT && (
            <>
                <ActionButton onClick={() => onAddFolder(folder.id, 'before')}>
                    + Before
                </ActionButton>
                <ActionButton onClick={() => onAddFolder(folder.id, 'after')}>
                    + After
                </ActionButton>
                <ActionButton onClick={() => onAddSubfolder(folder.id)}>
                    + Subfolder
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

  // rootFolder is null if no study selected
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
      const newFolder = createNewFolder();

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
      const newSubfolder = createNewFolder('New Subfolder', FolderType.SUBFOLDER);
      
      if (!folder.children) {
        folder.children = [];
      }
      folder.children.push(newSubfolder);
    });
  }, [updateTree, findFolderInTree]);

  // Удаление папки
  const handleDeleteFolder = useCallback((folderId: string) => {
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
      folder.name = newName;
    });
  }, [updateTree, findFolderInTree]);

  // Добавление папки в корень
  const handleAddToRoot = useCallback(() => {
    updateTree((tree: Folder) => {
      tree.children.push(createNewFolder());
    });
  }, [updateTree, findFolderInTree]);

  // Генерация структуры JSON
  useEffect(() => {
    const buildObject = (folder: Folder): Folder => {
      const obj: Folder = {
        name: folder.name,
        type: folder.type,
        id: folder.id,
        status: folder.status,
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
    // Находим исследование по id
    const currentStudy = studies?.find(study => study.id === currentStudyId);
    if (!currentStudy) {
      return;
    }
    // Добавляем обновленную структуру папок
    currentStudy.folders_structure = rootFolder;
    // Сохраняем
    saveStudy(Tables.STUDY, currentStudy)
    //console.log(currentStudy);
    //saveStudy
    // Создание файла для скачивания
    // const dataStr = JSON.stringify(rootFolder, null, 2);
    // const dataBlob = new Blob([dataStr], { type: 'application/json' });
    // const url = URL.createObjectURL(dataBlob);
    
    // const link = document.createElement('a');
    // link.href = url;
    // link.download = `folder-structure-${new Date().toISOString().split('T')[0]}.json`;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
    // URL.revokeObjectURL(url);
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
      folderStructure = {
        id: generateId(),
        name: studies?.find(study => study.id === currentStudyId)?.protocol || 'Root Directory',
        type: FolderType.ROOT,
        status: FolderStatus.ACTIVE,
        children: [createNewFolder('Default folder', FolderType.FOLDER)],
      };
    }
    setRootFolder(folderStructure);
    setStructureObject({} as Folder);
  }, [currentStudyId, studies]);

  return (
    <div className="folder-tree-container">
      <div className="folder-tree-header">
        <h2>Study Folders Structure Management</h2>
        <div className="controls">
{/*           <ActionButton onClick={handleAddToRoot}>
            + Add Root Folder
          </ActionButton>
 */}          
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
            />
          </div>

          {/* <div className="structure-preview">
            <div className="structure-header">
              <h3>Current Structure (JSON):</h3>
              <button 
                onClick={() => setStructureObject({} as Folder)}
                className="clear-button"
              >
                Clear Preview
              </button>
            </div>
            {structureObject.id && (
              <pre data-testid="structure-output">
                {JSON.stringify(structureObject, null, 2)}
              </pre>
            )}
          </div> */}
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
            Depth: <strong>{getTreeDepth(rootFolder)}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

// Вспомогательные функции
const countFolders = (folder: Folder): number => {
  let count = 1; // Текущая папка
  folder.children.forEach(child => {
    count += countFolders(child);
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