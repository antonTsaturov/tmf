// MainContext.tsx
'use client'
import { useStudies } from '@/hooks/useStudies';
import React from 'react';
import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { Study } from '@/types/types';

interface AdminContextType {
    studies: Study[];
    setStudies: React.Dispatch<React.SetStateAction<Study[]>>;
    loadStudies: () => Promise<void>;
    error: string | null;
    saveStudy: (studyData: Study) => Promise<Study>;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { studies, setStudies, loadStudies, error, saveStudy } = useStudies();

  return (
    <AdminContext value={{ studies, setStudies, loadStudies, error, saveStudy  }}>
      {children}
    </AdminContext>
  );
};