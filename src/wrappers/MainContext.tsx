// MainContext.tsx
'use client'
import React, { createContext, useState, ReactNode } from 'react';
import { FileNode, ViewLevel } from '@/components/FileExplorer';
import { Document } from '@/types/document';
import { Study, StudySite } from '@/types/types';

// Интерфейс для предпросмотра файла перед загрузкой
export interface FilePreview {
  file: File;
  customName: string;
  size: number;
  studyId: number;
  siteId: string | number;
  folderId: string;
  folderName: string;
  createdBy: string;
}

export interface MainContextProps {
  isModal: boolean;
  isRightFrameOpen: boolean;
  docWasDeleted: boolean;
  currentStudy: Study | undefined;
  currentCountry: string | undefined;
  currentSite: StudySite | undefined;
  selectedFolder: FileNode | null;
  selectedDocument: Document | null;
  currentLevel: ViewLevel | undefined;
  filePreview: FilePreview | null;
  isPreviewOpen: boolean;
}

interface MainContextType {
  context: MainContextProps;
  updateContext: (newContext: Partial<MainContextProps>) => void;
  resetContext: () => void;
  // Новые методы для работы с предпросмотром
  setFilePreview: (preview: FilePreview | null) => void;
  clearFilePreview: () => void;
}

const defaultContext: MainContextProps = {
  isModal: false,
  isRightFrameOpen: false,
  docWasDeleted: false,
  currentStudy: undefined,
  currentCountry: undefined,
  currentSite: undefined,
  selectedFolder: null,
  selectedDocument: null,
  currentLevel: undefined,
  filePreview: null,
  isPreviewOpen: false
};

export const MainContext = createContext<MainContextType | undefined>(undefined);

export const ContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<MainContextProps>(defaultContext);

  const updateContext = (newContext: Partial<MainContextProps>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  };

  const resetContext = () => {
    setContext(defaultContext);
  };

  const setFilePreview = (preview: FilePreview | null) => {
    setContext(prev => ({
      ...prev,
      filePreview: preview,
      isPreviewOpen: !!preview
    }));
  };

  const clearFilePreview = () => {
    setContext(prev => ({
      ...prev,
      filePreview: null,
      isPreviewOpen: false
    }));
  };

  return (
    <MainContext.Provider value={{ 
      context, 
      updateContext, 
      resetContext,
      setFilePreview,
      clearFilePreview
    }}>
      {children}
    </MainContext.Provider>
  );
};