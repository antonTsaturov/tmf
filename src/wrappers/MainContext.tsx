// // src/wrappers/MainContext.tsx
// "use client";

// import React, { createContext, useState, ReactNode } from "react";
// import { FileNode } from "@/components/FolderExplorer";
// import type { Document } from "@/types/document";
// import { Study, StudySite } from "@/types/types";
// import { ViewLevel } from "@/types/types";
// import { Folder } from "@/types/folder";
// import { FolderStructureProvider } from "./FolderStructureContext";

// export interface MainContextProps {
//   isModal: boolean;
//   isRightFrameOpen: boolean;
//   docWasDeleted: boolean;
//   currentStudy: Study | undefined;
//   currentCountry: string | undefined;
//   currentSite: StudySite | undefined;
//   selectedFolder: FileNode | null;
//   selectedDocument: Document | null;
//   isFolderContentLoading: boolean;

//   onDocumentUpdatedId: string | null;
//   currentLevel: ViewLevel | undefined;
//   isNewVersionPanelOpen: boolean;
//   isSubmittingToReview: boolean;
//   isAcceptedForReview: boolean;
//   isDeletePanelOpen: boolean;
//   isArchivePanelOpen: boolean;
//   isUnarchivePanelOpen: boolean;
//   isEditTitlePanelOpen: boolean;
//   isRestorePanelOpen: boolean;
//   isStudyInfoPanelOpen: boolean;
// }

// interface MainContextType {
//   context: MainContextProps;
//   updateContext: (newContext: Partial<MainContextProps>) => void;
//   resetContext: () => void;
// }

// const defaultContext: MainContextProps = {
//   isModal: false, // Флаг открытия админ панели
//   isRightFrameOpen: false, // Флаг состояния правой панели
//   docWasDeleted: false,
//   currentStudy: undefined,
//   currentCountry: undefined,
//   currentSite: undefined,
//   selectedFolder: null, // ID выбрабранной пользователем папки
//   selectedDocument: null, // Объект выбрабранного пользователем документа
//   isFolderContentLoading: false,

//   onDocumentUpdatedId: null,
//   currentLevel: undefined, // Текущий уровень просмотра папок (General либо Site Level)
//   isNewVersionPanelOpen: false, // Флаг для открытия окна загрузки новой ВЕРСИИ документа
//   isSubmittingToReview: false, // Флаг для открытия окна отправки документа на ревью
//   isAcceptedForReview: false, // Флаг для открытия окна для ревью документа
//   isDeletePanelOpen: false, // Флаг для открытия окна удаления документа
//   isArchivePanelOpen: false,
//   isUnarchivePanelOpen: false,
//   isEditTitlePanelOpen: false,
//   isRestorePanelOpen: false,
//   isStudyInfoPanelOpen: false
// };

// export const MainContext = createContext<MainContextType | undefined>(
//   undefined,
// );

// export const ContextProvider: React.FC<{ children: ReactNode }> = ({
//   children,
// }) => {
//   const [context, setContext] = useState<MainContextProps>(defaultContext);

//   const updateContext = (newContext: Partial<MainContextProps>) => {
//     setContext((prev) => ({ ...prev, ...newContext }));
//   };

//   const resetContext = () => {
//     setContext(defaultContext);
//   };

//   // 🔹 Приводим тип вручную
//   const folderStructure: Folder | null =
//     (context.currentStudy?.folders_structure as Folder) ?? null;

//   return (
//     <MainContext.Provider
//       value={{
//         context,
//         updateContext,
//         resetContext,
//       }}
//     >
//       <FolderStructureProvider structure={folderStructure}>
//         {children}
//       </FolderStructureProvider>
//     </MainContext.Provider>
//   );
// };

// src/wrappers/MainContext.tsx
"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";
import { FileNode } from "@/components/FolderExplorer";
import type { Document } from "@/types/document";
import { Study, StudySite } from "@/types/types";
import { ViewLevel } from "@/types/types";
import { Folder } from "@/types/folder";
import { FolderStructureProvider } from "./FolderStructureContext";

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

const STORAGE_KEY = 'main_context_state';

const defaultContext: MainContextProps = {
  isModal: false,
  isRightFrameOpen: false,
  docWasDeleted: false,
  currentStudy: undefined,
  currentCountry: undefined,
  currentSite: undefined,
  selectedFolder: null,
  selectedDocument: null,
  isFolderContentLoading: false,

  onDocumentUpdatedId: null,
  currentLevel: undefined,
  isNewVersionPanelOpen: false,
  isSubmittingToReview: false,
  isAcceptedForReview: false,
  isDeletePanelOpen: false,
  isArchivePanelOpen: false,
  isUnarchivePanelOpen: false,
  isEditTitlePanelOpen: false,
  isRestorePanelOpen: false,
  isStudyInfoPanelOpen: false
};

export const MainContext = createContext<MainContextType | undefined>(undefined);

export const ContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);  
  // Инициализируем стейт. Если в sessionStorage есть данные, берем их.
  const [context, setContext] = useState<MainContextProps>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return { ...defaultContext, ...JSON.parse(saved) };
        } catch (e) {
          console.error("Error restoring context from sessionStorage", e);
        }
      }
    }
    return defaultContext;
  });

  // Сохраняем важные фильтры при каждом изменении context
  // useEffect(() => {
  //   const { 
  //     currentStudy, 
  //     currentCountry, 
  //     currentSite, 
  //     currentLevel, 
  //     selectedFolder 
  //   } = context;

  //   const stateToSave = {
  //     currentStudy,
  //     currentCountry,
  //     currentSite,
  //     currentLevel,
  //     selectedFolder
  //   };

  //   sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  // }, [
  //   context.currentStudy, 
  //   context.currentCountry, 
  //   context.currentSite, 
  //   context.currentLevel, 
  //   context.selectedFolder
  // ]);

  // Синхронизация с sessionStorage только после инициализации
  useEffect(() => {
    if (isInitialized) {
      const stateToSave = {
        currentStudy: context.currentStudy,
        currentCountry: context.currentCountry,
        currentSite: context.currentSite,
        currentLevel: context.currentLevel,
        selectedFolder: context.selectedFolder
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } else {
      setIsInitialized(true);
    }
  }, [
    context.currentStudy,
    context.currentCountry,
    context.currentSite,
    context.currentLevel,
    context.selectedFolder,
    isInitialized
  ]);  

  const updateContext = (newContext: Partial<MainContextProps>) => {
    setContext((prev) => ({ ...prev, ...newContext }));
  };

  const resetContext = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setContext(defaultContext);
    setIsInitialized(false);
  };

  const folderStructure: Folder | null =
    (context.currentStudy?.folders_structure as Folder) ?? null;

  return (
    <MainContext.Provider value={{ context, updateContext, resetContext }}>
      <FolderStructureProvider structure={folderStructure}>
        {children}
      </FolderStructureProvider>
    </MainContext.Provider>
  );
};