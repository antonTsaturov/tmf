// MainContext.tsx
'use client'
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { FileNode } from '@/components/FileExplorer';

type ViewLevel = 'site' | 'general';

export interface MainContextProps {
  isModal: boolean;
  currentProject: string | undefined;
  currentCountry: string | undefined;
  currentSite: string | undefined;
  selectedFolder: FileNode | null; // Добавляем выбранную папку
  currentLevel: ViewLevel | null;
}

interface MainContextType {
  context: MainContextProps;
  updateContext: (newContext: Partial<MainContextProps>) => void;
  resetContext: () => void;
}

const defaultContext: MainContextProps = {
  isModal: false,
  currentProject: undefined,
  currentCountry: undefined,
  currentSite: undefined,
  selectedFolder: null, // По умолчанию null
  currentLevel: null
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

  return (
    <MainContext.Provider value={{ context, updateContext, resetContext }}>
      {children}
    </MainContext.Provider>
  );
};

export const useMainContext = () => {
  const context = useContext(MainContext);
  if (!context) {
    throw new Error('useMainContext must be used within ContextProvider');
  }
  return context;
};