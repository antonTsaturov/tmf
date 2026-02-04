// MainContext.tsx
'use client'
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

export interface MainContextProps {
  isModal: boolean;
  currentProject: string | undefined;
  currentCountry: string | undefined;
  currentSite: string | undefined;
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
};

export const MainContext = createContext<MainContextType | undefined>(undefined);

export const ContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<MainContextProps>(defaultContext);
  //const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка настроек при монтировании
//   useEffect(() => {
//     const loadContext = () => {
//       try {
//         const saved = localStorage.getItem('main-context');
//         if (saved) {
//           const parsed = JSON.parse(saved);
//           setSettings({ ...defaultContext, ...parsed });
//         }
//       } catch (error) {
//         console.error('Ошибка загрузки контекста:', error);
//       } finally {
//         setIsLoaded(true);
//       }
//     };

//     loadContext();
//   }, []);

  // Сохранение настроек при изменении
//   useEffect(() => {
//     if (isLoaded) {
//       localStorage.setItem('abacus-settings', JSON.stringify(settings));
//     }
//   }, [settings, isLoaded]);

  const updateContext = (newContext: Partial<MainContextProps>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  };

  const resetContext = () => {
    setContext(defaultContext);
  };
  
//   if (!isLoaded) {
//     return <div>Загрузка контекста...</div>;
//   }

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