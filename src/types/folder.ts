// types/folder.ts
export interface FolderNode {
  id: string;
  name: string;
  type: 'root' | 'folder' | 'subfolder';
  level: 'general' | 'site';
  status: 'active' | 'inactive';
  children?: FolderNode[];
  shouldEdit?: boolean;
}

export enum FolderLevel {
  ROOT = 'root',
  SITE = 'site',
  GENERAL = 'general',
  COUNTRY= 'country'
};


export interface Folder {
  id: string;
  name: string;
  type: FolderType;
  level?: FolderLevel;
  status: FolderStatus;
  children: Folder[];
  shouldEdit: boolean;
}

export enum FolderType {
  ROOT = 'root',
  FOLDER = 'folder',
  SUBFOLDER = 'subfolder'
}

export enum FolderStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
  ARCHIVED = 'archived'
}
