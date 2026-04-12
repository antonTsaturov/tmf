// hooks/useFolderName.ts
import { FolderNode, Folder } from '@/types/folder';
import { useFolderStructure } from '@/wrappers/FolderStructureContext';

export function useFolderName() {
  const { getFolderName } = useFolderStructure();
  
  return (folderId: string): string => {
    return getFolderName(folderId) ?? 'Unknown Folder';
  };
}

export function useFolderById() {
  const { getFolderById } = useFolderStructure();
  
  return getFolderById;
}

export function useFolderpath() {
  const { getFolderPath } = useFolderStructure();
  
  return getFolderPath;
}

export function useFolderNameByMap() {

  function findFolderById(
    node: FolderNode | Folder,
    folderId: string
  ): FolderNode | null {
    if (node.id === folderId) {
      return node as FolderNode;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = findFolderById(child, folderId);
        if (found) return found;
      }
    }
    
    return null;
  }

  function getFolderNameFromStructure(
    structure: Folder | null | undefined,
    folderId: string
  ): string | null {
    if (!structure) return null;
    
    const folder = findFolderById(structure, folderId);
    return folder?.name ?? null;
  }

  function getFolderNameFromStudiesMap(
    studiesMap: Map<number, any>,
    studyId: number,
    folderId: string
  ): string | null {
    const study = studiesMap.get(studyId);
    if (!study?.folders_structure) return null;
    
    return getFolderNameFromStructure(study.folders_structure, folderId);
  }  
  
  return {
    getFolderNameFromStudiesMap,
    getFolderNameFromStructure
  }
}