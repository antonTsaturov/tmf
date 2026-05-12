
// hooks/useFolderCreation.ts
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FolderType, FolderStatus, FolderLevel, Folder } from '@/types/folder';

export const generateId = (level: FolderLevel): string => `${level}-${uuidv4()}`;

export interface CreateFolderOptions {
  name?: string;
  type?: FolderType;
  shouldEdit?: boolean;
  level?: FolderLevel;
  parentLevel?: FolderLevel;
}

export const createNewFolder = (
  name: string = '',
  type: FolderType = FolderType.FOLDER,
  shouldEdit: boolean = false,
  level: FolderLevel = FolderLevel.GENERAL,
  parentLevel?: FolderLevel
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

export const useFolderCreation = () => {
  const createFolder = useCallback((options: CreateFolderOptions = {}) => {
    const {
      name = '',
      type = FolderType.FOLDER,
      shouldEdit = false,
      level = FolderLevel.GENERAL,
      parentLevel
    } = options;

    return createNewFolder(name, type, shouldEdit, level, parentLevel);
  }, []);

  const createSubfolder = useCallback((
    parentLevel: FolderLevel,
    name: string = '',
    shouldEdit: boolean = true
  ) => {
    return createNewFolder(
      name,
      FolderType.SUBFOLDER,
      shouldEdit,
      parentLevel, // Наследуем уровень родителя
      parentLevel
    );
  }, []);

  const createRootFolder = useCallback((
    name: string = 'Root Directory',
    shouldEdit: boolean = false
  ) => {
    return createNewFolder(
      name,
      FolderType.ROOT,
      shouldEdit,
      FolderLevel.ROOT
    );
  }, []);

  return {
    createFolder,
    createSubfolder,
    createRootFolder,
    generateId
  };
};