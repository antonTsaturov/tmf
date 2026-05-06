import { FileNode } from "..";

export const findNodeById = (nodes: FileNode[], id: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Находим путь к папке через рекурсивный поиск
export const findPathToFolder = (nodes: FileNode[], targetId: string, path: string[] = []): string[] | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return path;
    }
    if (node.children) {
      const result = findPathToFolder(node.children, targetId, [...path, node.id]);
      if (result) return result;
    }
  }
  return null;
};

export const collectAllFolderIds = (nodes: FileNode[]): string[] => {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.type === 'folder' || node.type === 'subfolder') {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        ids.push(...collectAllFolderIds(node.children));
      }
    }
  }
  return ids;
};

export const collectAllFolderIdsFromData = (nodes: FileNode[]): string[] => {
  const ids: string[] = [];
  for (const node of nodes) {
    // Собираем ID для всех типов папок
    if (node.type === 'folder' || node.type === 'subfolder' || node.type === 'root') {
      if (node.children && node.children.length > 0) {
        ids.push(node.id);
        if (node.children) {
          ids.push(...collectAllFolderIdsFromData(node.children));
        }
      }
    }
  }
  return ids;
};

