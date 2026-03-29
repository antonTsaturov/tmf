// MainContext.tsx
'use client'
import React, { createContext, useState, ReactNode } from 'react';
import { FileNode } from '@/components/FileExplorer';
import type { Document } from '@/types/document';
import { Study, StudySite } from '@/types/types';
import { ViewLevel } from '@/types/types';
import { FoldersStructure } from '@/types/folder';
import { FolderStructureProvider } from './FolderStructureContext';

export interface MainContextProps {
  isModal: boolean;
  isRightFrameOpen: boolean;
  docWasDeleted: boolean;
  currentStudy: Study | undefined;
  currentCountry: string | undefined;
  currentSite: StudySite | undefined;
  selectedFolder: FileNode | null;
  selectedDocument: Document | null;
  isFolderContentLoading: boolean;

  onDocumentUpdatedId: string | null;
  currentLevel: ViewLevel | undefined;
  isNewVersionPanelOpen: boolean;
  isSubmittingToReview: boolean;
  isAcceptedForReview: boolean;
  isDeletePanelOpen: boolean;
  isArchivePanelOpen: boolean;
  isUnarchivePanelOpen: boolean;
  isEditTitlePanelOpen: boolean;
  isRestorePanelOpen: boolean;
  isStudyInfoPanelOpen: boolean;
}

interface MainContextType {
  context: MainContextProps;
  updateContext: (newContext: Partial<MainContextProps>) => void;
  resetContext: () => void;
}

const defaultContext: MainContextProps = {
  isModal: false, // Флаг открытия админ панели
  isRightFrameOpen: false, // Флаг состояния правой панели
  docWasDeleted: false,
  currentStudy: undefined,
  currentCountry: undefined,
  currentSite: undefined,
  selectedFolder: null, // ID выбрабранной пользователем папки
  selectedDocument: null, // Объект выбрабранного пользователем документа
  isFolderContentLoading: false,

  onDocumentUpdatedId: null,
  currentLevel: undefined, // Текущий уровень просмотра папок (General либо Site Level)
  isNewVersionPanelOpen: false, // Флаг для открытия окна загрузки новой ВЕРСИИ документа
  isSubmittingToReview: false, // Флаг для открытия окна отправки документа на ревью
  isAcceptedForReview: false, // Флаг для открытия окна для ревью документа
  isDeletePanelOpen:false,     // Флаг для открытия окна удаления документа
  isArchivePanelOpen: false,
  isUnarchivePanelOpen: false,
  isEditTitlePanelOpen: false,
  isRestorePanelOpen: false,
  isStudyInfoPanelOpen: false
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

  // 🔹 Приводим тип вручную
  const folderStructure: FoldersStructure | null = 
    (context.currentStudy?.folders_structure as FoldersStructure) ?? null;

  return (
    <MainContext.Provider value={{ 
      context, 
      updateContext, 
      resetContext,
    }}>
      <FolderStructureProvider structure={folderStructure}>
        {children}
      </FolderStructureProvider>
    </MainContext.Provider>
  );
};