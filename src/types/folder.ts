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

export interface FoldersStructure {
  id: string;
  name: string;
  type: 'root';
  level: 'general';
  status: 'active';
  children: FolderNode[];
  shouldEdit?: boolean;
}