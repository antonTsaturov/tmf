// AdminContext.tsx
'use client'
import { useStudies } from '@/hooks/useStudies';
import React from 'react';
import { createContext, ReactNode } from 'react';
import { Study, StudySite } from '@/types/types';
import { Tables } from '@/lib/db/schema';

interface AdminContextType {
    studies: Study[];
    setStudies: React.Dispatch<React.SetStateAction<Study[]>>;
    sites: StudySite[];
    setSites: React.Dispatch<React.SetStateAction<StudySite[]>>;
    loadTable: () => Promise<void>;
    loadTablePartial: (table: Tables, id: number) => Promise<StudySite | StudySite[] | []>;
    error: string | null;
    saveStudy: (table: Tables, studyData: Study) => Promise<Study>;
    saveSite: (table: Tables, siteData: StudySite) => Promise<StudySite>;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { studies, sites, setStudies, setSites, loadTable, loadTablePartial, error, saveStudy, saveSite } = useStudies();

  return (
    <AdminContext value={{ studies, sites, setStudies, setSites, loadTable, loadTablePartial, error, saveStudy, saveSite  }}>
      {children}
    </AdminContext>
  );
};