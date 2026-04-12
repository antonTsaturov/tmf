// contexts/FolderStructureContext.tsx
'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { FoldersStructure, FolderNode } from '@/types/folder';

interface FolderStructureContextType {
  getFolderName: (folderId: string) => string | null;
  getFolderById: (folderId: string) => FolderNode | null;
  getFolderPath: (folderId: string) => string[];
  getChildren: (folderId: string) => FolderNode[];
  structure: FoldersStructure | null;
}

const FolderStructureContext = createContext<FolderStructureContextType | null>(null);

// 🔹 Рекурсивный сбор пути к папке
function findFolderPath(
  node: FolderNode | FoldersStructure,
  id: string,
  path: string[] = []
): string[] | null {
  const currentPath = [...path, node.name];
  
  if (node.id === id) {
    return currentPath;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const found = findFolderPath(child, id, currentPath);
      if (found) return found;
    }
  }
  
  return null;
}

// 🔹 Построение flat-мапы для быстрого поиска
function buildFolderMap(
  node: FolderNode | FoldersStructure,
  map: Map<string, FolderNode> = new Map()
): Map<string, FolderNode> {
  map.set(node.id, node as FolderNode);
  
  if (node.children) {
    for (const child of node.children) {
      buildFolderMap(child, map);
    }
  }
  
  return map;
}

interface FolderStructureProviderProps {
  children: React.ReactNode;
  structure: FoldersStructure | null;
}

export function FolderStructureProvider({
  children,
  structure
}: FolderStructureProviderProps) {
  // 🔹 Кэшируем flat-мапу для O(1) поиска
  const folderMap = useMemo(() => {
    if (!structure) return new Map<string, FolderNode>();
    return buildFolderMap(structure);
  }, [structure]);

  const getFolderName = useCallback((folderId: string): string | null => {
    const folder = folderMap.get(folderId);
    return folder?.name ?? null;
  }, [folderMap]);

  const getFolderById = useCallback((folderId: string): FolderNode | null => {
    return folderMap.get(folderId) ?? null;
  }, [folderMap]);

  const getFolderPath = useCallback((folderId: string): string[] => {
    if (!structure) return [];
    const path = findFolderPath(structure, folderId);
    return path ?? [];
  }, [structure]);

  // Получить все дочерние папки
  const getChildren: (folderId: string) => FolderNode[] = useCallback((folderId) => {
    const folder = folderMap.get(folderId);
    return folder?.children ?? [];
  }, [folderMap]);  

  
  const value: FolderStructureContextType = {
    getFolderName,
    getFolderById,
    getFolderPath,
    getChildren,
    structure
  };

  return (
    <FolderStructureContext.Provider value={value}>
      {children}
    </FolderStructureContext.Provider>
  );
}

export function useFolderStructure() {
  const context = useContext(FolderStructureContext);
  
  if (!context) {
    throw new Error(
      'useFolderStructure must be used within a FolderStructureProvider'
    );
  }
  
  return context;
}