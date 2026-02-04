import { FileNode } from '../components/FileExplorer';

/**
 * Находит полный путь к файлу по его ID
 * @param data - Массив узлов дерева
 * @param nodeId - ID искомого узла
 * @returns Полный путь в формате 'Папка/Подпапка/Файл.расширение' или null если не найден
 */
export const findPathById = (data: FileNode[], nodeId: string): string | null => {
  const findPathRecursive = (nodes: FileNode[], targetId: string, currentPath: string[] = []): string[] | null => {
    for (const node of nodes) {
      const newPath = [...currentPath, node.name];
      
      if (node.id === targetId) {
        return newPath;
      }
      
      if (node.children && node.children.length > 0) {
        const foundPath = findPathRecursive(node.children, targetId, newPath);
        if (foundPath) {
          return foundPath;
        }
      }
    }
    return null;
  };
  
  const pathArray = findPathRecursive(data, nodeId);
  return pathArray ? pathArray.join('/') : null;
};

/**
 * Находит полный путь к файлу по его имени
 * @param data - Массив узлов дерева
 * @param nodeName - Имя искомого узла
 * @param exactMatch - Точное совпадение имени (регистронезависимое)
 * @returns Массив полных путей (если есть файлы с одинаковыми именами)
 */
export const findPathsByName = (
  data: FileNode[], 
  nodeName: string, 
  exactMatch: boolean = true
): string[] => {
  const paths: string[] = [];
  
  const findPathsRecursive = (nodes: FileNode[], targetName: string, currentPath: string[] = []) => {
    for (const node of nodes) {
      const newPath = [...currentPath, node.name];
      
      const matches = exactMatch 
        ? node.name.toLowerCase() === targetName.toLowerCase()
        : node.name.toLowerCase().includes(targetName.toLowerCase());
      
      if (matches) {
        paths.push(newPath.join('/'));
      }
      
      if (node.children && node.children.length > 0) {
        findPathsRecursive(node.children, targetName, newPath);
      }
    }
  };
  
  findPathsRecursive(data, nodeName);
  return paths;
};

/**
 * Находит все пути в дереве (полная карта)
 * @param data - Массив узлов дерева
 * @returns Объект с маппингом ID -> путь
 */
export const getAllPaths = (data: FileNode[]): Record<string, string> => {
  const pathMap: Record<string, string> = {};
  
  const traverse = (nodes: FileNode[], currentPath: string[] = []) => {
    for (const node of nodes) {
      const newPath = [...currentPath, node.name];
      pathMap[node.id] = newPath.join('/');
      
      if (node.children && node.children.length > 0) {
        traverse(node.children, newPath);
      }
    }
  };
  
  traverse(data);
  return pathMap;
};

/**
 * Находит узел по ID и возвращает его с путем
 */
export const findNodeWithPath = (
  data: FileNode[], 
  nodeId: string
): { node: FileNode; path: string } | null => {
  const findNodeRecursive = (
    nodes: FileNode[], 
    targetId: string, 
    currentPath: string[] = []
  ): { node: FileNode; path: string } | null => {
    for (const node of nodes) {
      const newPath = [...currentPath, node.name];
      
      if (node.id === targetId) {
        return { node, path: newPath.join('/') };
      }
      
      if (node.children && node.children.length > 0) {
        const result = findNodeRecursive(node.children, targetId, newPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  };
  
  return findNodeRecursive(data, nodeId);
};