import React, { useState, useCallback, FC, KeyboardEvent, ChangeEvent, useEffect, useContext } from 'react';
import '@/styles/FoldersStructureManager.css';
import { v4 as uuidv4 } from 'uuid';
import { CustomSelect } from '../Select'
import { AdminContext } from '@/wrappers/AdminContext';
import { FolderType, FolderStatus, Folder, ViewLevel } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { StructurePreview } from './StructurePreview';
import {
  Card,
  Flex,
  Text,
  Badge,
  Button,
  Separator,
  Heading,
  Box,
  IconButton,
  ScrollArea,
  TextField
} from '@radix-ui/themes';
import {
  PlusIcon,
  TrashIcon,
  DownloadIcon,
  UploadIcon,
  ResetIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  HomeIcon
} from '@radix-ui/react-icons';
import { FaRegFolder, FaRegFolderOpen } from "react-icons/fa";

export interface FolderPosition {
  folder: Folder;
  parent: Folder | null;
}

interface FolderItemProps {
  folder: Folder & { shouldEdit?: boolean };
  depth?: number;
  onAddFolder: (folderId: string, position: 'before' | 'after') => void;
  onAddSubfolder: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onUpdateName: (folderId: string, newName: string) => void;
  onEditComplete?: (folderId: string) => void;
  parentLevel?: ViewLevel; // Добавляем уровень родителя
}

interface FolderTreeProps {
  initialStructure?: Folder;
}

export const generateId = (level: ViewLevel): string => `${level}-${uuidv4()}`;

export const createNewFolder = (
  name: string = '', 
  type: FolderType = FolderType.FOLDER,
  shouldEdit: boolean = false,
  level: ViewLevel = ViewLevel.GENERAL, // По умолчанию GENERAL
  parentLevel?: ViewLevel // Уровень родителя
): Folder & { shouldEdit?: boolean } => {
  // Определяем уровень для новой папки
  let folderLevel = level;
  
  // Если есть родительский уровень, наследуем его
  if (parentLevel !== undefined) {
    folderLevel = parentLevel;
  }
  
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
export const createInitialStructure = (studyName: string = 'Root Directory', countries?: string[]): Folder => {
  const rootId = generateId(ViewLevel.ROOT);
  
  const children = [
    {
      id: generateId(ViewLevel.GENERAL),
      name: 'General',
      type: FolderType.FOLDER,
      level: ViewLevel.GENERAL,
      status: FolderStatus.ACTIVE,
      children: [],
      shouldEdit: false
    },
    {
      id: generateId(ViewLevel.SITE),
      name: 'Site Level',
      type: FolderType.FOLDER,
      level: ViewLevel.SITE,
      status: FolderStatus.ACTIVE,
      children: [],
      shouldEdit: false
    },
    ...(countries ? [{
      id: generateId(ViewLevel.COUNTRY),
      name: 'Country Level',
      type: FolderType.FOLDER,
      level: ViewLevel.COUNTRY,
      status: FolderStatus.ACTIVE,
      children: [],
      shouldEdit: false
    }] : [])
  ];

  return {
    id: rootId,
    name: studyName,
    type: FolderType.ROOT,
    level: ViewLevel.ROOT,
    status: FolderStatus.ACTIVE,
    shouldEdit: false,
    children
  };
};


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
  // Используем shouldEdit только при первоначальном монтировании
  const [isEditing, setIsEditing] = useState<boolean>(() => folder.shouldEdit || false);
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
    if (folder.type === FolderType.ROOT) return <HomeIcon />;
    if (folderLevel === ViewLevel.SITE || folderLevel === ViewLevel.GENERAL) {
      return folder.children.length > 0 ? (isExpanded ? <FaRegFolderOpen /> : <FaRegFolder />) : <FaRegFolder />;
    }
    return folder.children.length > 0 ? (isExpanded ? <FaRegFolderOpen /> : <FaRegFolder />) : <FaRegFolder />;
  };

  // Получаем цвет фона в зависимости от уровня
  const getFolderBackground = () => {
    if (folderLevel === ViewLevel.SITE) {
      return 'var(--green-3)';
    } else if (folderLevel === ViewLevel.GENERAL) {
      return 'var(--blue-3)';
    } else if (folderLevel === ViewLevel.COUNTRY){
      return 'var(--gray-3)';
    }
    return 'transparent';
  };


return (
    <Box>
      <Card 
        variant="ghost" 
        style={{ 
          backgroundColor: getFolderBackground(), 
          marginBottom: '22px', // Плотная компоновка
          padding: '4px 8px' 
        }}
      >
        <Flex align="center" justify="between" style={{ height: 32 }}>
          <Flex align="center" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
            
            {/* 1. Фиксированная область шеврона (24px) */}
            <Box style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              {folder.children && folder.children.length > 0 && (
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                </IconButton>
              )}
            </Box>

            {/* 2. Иконка папки */}
            <Box style={{ color: 'var(--accent-9)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {getFolderIcon()}
            </Box>

            {/* 3. Контентная часть (Текст или Инпут) */}
            <Box style={{ flexGrow: 1, minWidth: 0 }}>
              {isEditing ? (
                <TextField.Root
                  size="1"
                  value={editingName}
                  onChange={(e) => handleNameChange(e)}
                  onBlur={handleNameSave}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  style={{ width: '100%', maxWidth: 250 }}
                />
              ) : (
                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                  <Text
                    size="2"
                    weight={folder.type === FolderType.ROOT ? 'bold' : 'regular'}
                    style={{ 
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    onDoubleClick={() => setIsEditing(true)}
                  >
                    {folder.name}
                  </Text>
                  
                  {folderLevel !== undefined && folder.type !== FolderType.ROOT && (
                    <Badge 
                      size="1" 
                      color={folderLevel === ViewLevel.SITE ? 'green'
                              : folderLevel === ViewLevel.GENERAL ? 'blue'
                              : 'gray' }
                      variant="soft"
                      style={{ flexShrink: 0 }}
                    >
                      {folderLevel === ViewLevel.SITE ? 'SL' 
                      : folderLevel === ViewLevel.GENERAL ? 'G'
                      : 'CL'
                      }
                    </Badge>
                  )}
                </Flex>
              )}
            </Box>
          </Flex>

          {/* 4. Кнопки действий */}
          {folder.type !== FolderType.ROOT && (
            <Flex gap="1" ml="2" style={{ flexShrink: 0 }}>
              <IconButton
                size="1"
                variant="soft"
                color="iris"
                onClick={() => {
                  onAddSubfolder(folder.id)
                  setTimeout(()=>{folder.children && folder.children.length > 0 && setIsExpanded(isExpanded)}, 400)
                  //setIsExpanded(!isExpanded)
                }}
                title="Add subfolder"
              >
                <PlusIcon width="14" height="14" />
              </IconButton>
              <IconButton
                size="1"
                variant="soft"
                color="red"
                onClick={() => onDelete(folder.id)}
                title="Delete folder"
              >
                <TrashIcon width="14" height="14" />
              </IconButton>
            </Flex>
          )}
        </Flex>
      </Card>

      {/* 5. Рекурсивный рендеринг детей */}
      {isExpanded && folder.children && folder.children.length > 0 && (
        <Box style={{ paddingLeft: 24}}>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              onAddFolder={onAddFolder}
              onAddSubfolder={onAddSubfolder}
              onDelete={onDelete}
              onUpdateName={onUpdateName}
              parentLevel={folderLevel}
              onEditComplete={onEditComplete}
            />
          ))}
        </Box>
      )}
    </Box>
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
      for (const child of children) {
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
      if (folder.name === 'Site Level' || folder.name === 'General' || folder.name === 'Country Level') {
        alert('Cannot rename root level folders');
        return;
      }
      
      folder.name = newName;
    });
  }, [updateTree, findFolderInTree]);

  // Очистка флага редактирования
  const handleEditComplete = (folderId: string) => {
    updateTree((tree: Folder) => {
      const result = findFolderInTree(folderId, tree);
      if (!result) return;
      const { folder } = result;
      delete (folder as any).shouldEdit;
    });
  };

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

  // Создаем начальную структуру с Site Level, Country & General
  useEffect(() => {
    if (currentStudyId == null) {
      setRootFolder(null);
      setStructureObject({} as Folder);
      return;
    }

    const countries = studies?.find(study => study.id === currentStudyId && study.countries.length > 1)?.countries;

    const currentStudyFoldersStructure = studies?.find(study => study.id === currentStudyId)?.folders_structure;
    let folderStructure: Folder;
    
    if (currentStudyFoldersStructure && typeof currentStudyFoldersStructure === 'object' && !Array.isArray(currentStudyFoldersStructure)) {
      folderStructure = currentStudyFoldersStructure as Folder;
    } else {
      // Создаем начальную структуру 
      const studyName = studies?.find(study => study.id === currentStudyId)?.protocol || 'Root Directory';
      if (!countries) {
        folderStructure = createInitialStructure(studyName);
      } else {
        folderStructure = createInitialStructure(studyName, countries);
      }
      
    }
    
    setRootFolder(folderStructure);
    setStructureObject({} as Folder);
  }, [currentStudyId, studies]);

  return (
    <Flex direction="column" gap="4" p="4">
      {/* Header */}
      <Card>
        <Flex align="center" justify="between">
          <Heading size="4">Study Folders Structure Management</Heading>
          <Flex gap="2">
            <Button size="2" variant="surface" onClick={handleExportStructure}>
              <Flex gap="2" align="center">
                <DownloadIcon />
                Write
              </Flex>
            </Button>
            <Button size="2" variant="surface" onClick={handleImportStructure}>
              <Flex gap="2" align="center">
                <UploadIcon />
                Import
              </Flex>
            </Button>
            <Button size="2" variant="soft" color="gray" onClick={handleReset}>
              <Flex gap="2" align="center">
                <ResetIcon />
                Reset
              </Flex>
            </Button>

            <CustomSelect
              studies={studies}
              studyHandler={studyHandler}
            />

          </Flex>
        </Flex>
      </Card>


      <Flex gap="4" wrap="wrap">
        {/* Folder Tree */}
        <Card style={{ flex: '1 1 400px', minWidth: '55%' }}>
          {rootFolder ? (
            <ScrollArea style={{ maxHeight: 600 }}>
              <Flex direction="column" gap="2" p="2">
                <FolderItem
                  folder={rootFolder}
                  onAddFolder={handleAddFolder}
                  onAddSubfolder={handleAddSubfolder}
                  onDelete={handleDeleteFolder}
                  onUpdateName={handleUpdateName}
                  onEditComplete={handleEditComplete}
                />
              </Flex>
            </ScrollArea>
          ) : (
            <Flex align="center" justify="center" p="6" style={{ minHeight: 200 }}>
              <Flex direction="column" align="center" gap="3">
                <FaRegFolder width="48" height="48" color="var(--gray-8)" />
                <Text size="2" color="gray">
                  No study selected. Please select a study to view or edit its folder structure.
                </Text>
              </Flex>
            </Flex>
          )}
        </Card>

        {/* Structure Preview */}
        <Box style={{ flex: '1 1 400px' }}>
          <StructurePreview structure={[structureObject]} />
        </Box>
      </Flex>

      {/* Stats */}
      {rootFolder && (
        <Card>
          <Flex gap="4" wrap="wrap" justify="center">
            <Flex gap="2" align="center">
              <Text size="1" color="gray">Project:</Text>
              <Text size="2" weight="bold">{rootFolder.name}</Text>
            </Flex>
            <Separator orientation="vertical" />
            <Flex gap="2" align="center">
              <Text size="1" color="gray">Total folders:</Text>
              <Text size="2" weight="bold">{countFolders(rootFolder)}</Text>
            </Flex>
            <Separator orientation="vertical" />
            <Flex gap="2" align="center">
              <Text size="1" color="gray">Site Level:</Text>
              <Badge color="green" variant="soft">{countFoldersByLevel(rootFolder, ViewLevel.SITE)}</Badge>
            </Flex>
            <Separator orientation="vertical" />
            <Flex gap="2" align="center">
              <Text size="1" color="gray">General:</Text>
              <Badge color="blue" variant="soft">{countFoldersByLevel(rootFolder, ViewLevel.GENERAL)}</Badge>
            </Flex>
            <Separator orientation="vertical" />
            <Flex gap="2" align="center">
              <Text size="1" color="gray">Depth:</Text>
              <Text size="2" weight="bold">{getTreeDepth(rootFolder)}</Text>
            </Flex>
          </Flex>
        </Card>
      )}
    </Flex>
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

const countFoldersByLevel = (folder: Folder, level: ViewLevel): number => {
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