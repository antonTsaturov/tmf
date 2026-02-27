// MainContext.tsx
'use client'
import React, { createContext, useState, ReactNode } from 'react';
import { FileNode, ViewLevel } from '@/components/FileExplorer';
import type { Document } from '@/types/document';
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
  createdBy: string | number;
}

// Интерфейс для загрузки новой версии документа
export interface NewVersionPreview {
  file: File;
  document: Document;
}

export interface MainContextProps {
  isModal: boolean;
  isRightFrameOpen: boolean;
  isFolderContentLoading: boolean;
  docWasDeleted: boolean;
  currentStudy: Study | undefined;
  currentCountry: string | undefined;
  currentSite: StudySite | undefined;
  selectedFolder: FileNode | null;
  selectedDocument: Document | null;
  currentLevel: ViewLevel | undefined;
  filePreview: FilePreview | null;
  isPreviewOpen: boolean;
  newVersionPreview: NewVersionPreview | null;
  isNewVersionPanelOpen: boolean;
  isSubmittingToReview: boolean;
  isAcceptedForReview: boolean;
  isDeletePanelOpen: boolean;
  
}

interface MainContextType {
  context: MainContextProps;
  updateContext: (newContext: Partial<MainContextProps>) => void;
  resetContext: () => void;
  // Методы для предпросмотра
  setFilePreview: (preview: FilePreview | null) => void;
  clearFilePreview: () => void;
  setNewVersionPreview: (preview: NewVersionPreview | null) => void;
  clearNewVersionPreview: () => void;
}

const defaultContext: MainContextProps = {
  isModal: false, // Флаг открытия админ панели
  isRightFrameOpen: false, // Флаг состояния правой панели
  isFolderContentLoading: false,
  docWasDeleted: false,
  currentStudy: undefined,
  currentCountry: undefined,
  currentSite: undefined,
  selectedFolder: null, // ID выбрабранной пользователем папки
  selectedDocument: null, // Объект выбрабранного пользователем документа
  currentLevel: undefined, // Текущий уровень просмотра папок (General либо Site Level)
  filePreview: null, // Объект нового документа
  isPreviewOpen: false, // Флаг для открытия окна для загрузки нового документа
  newVersionPreview: null, // Объект новой версии документа
  isNewVersionPanelOpen: false, // Флаг для открытия окна загрузки новой ВЕРСИИ документа
  isSubmittingToReview: false, // Флаг для открытия окна отправки документа на ревью
  isAcceptedForReview: false, // Флаг для открытия окна для ревью документа
  isDeletePanelOpen:false     // Флаг для открытия окна удаления документа
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

  const setNewVersionPreview = (preview: NewVersionPreview | null) => {
    setContext(prev => ({
      ...prev,
      newVersionPreview: preview,
      isNewVersionPanelOpen: !!preview
    }));
  };

  const clearNewVersionPreview = () => {
    setContext(prev => ({
      ...prev,
      newVersionPreview: null,
      isNewVersionPanelOpen: false
    }));
  };

  return (
    <MainContext.Provider value={{ 
      context, 
      updateContext, 
      resetContext,
      setFilePreview,
      clearFilePreview,
      setNewVersionPreview,
      clearNewVersionPreview,
      
    }}>
      {children}
    </MainContext.Provider>
  );
};