// AdminContext.tsx
'use client'
import { useStudies } from '@/hooks/useStudies';
import React, { useState } from 'react';
import { createContext, ReactNode } from 'react';
import { Study, StudySite, StudyUser } from '@/types/types';
import { Tables } from '@/lib/db/schema';

interface AdminContextType {
    studies: Study[];
    setStudies: React.Dispatch<React.SetStateAction<Study[]>>;
    sites: StudySite[];
    setSites: React.Dispatch<React.SetStateAction<StudySite[]>>;
    loadTable: (table: Tables) => Promise<void>;
    loadTablePartial: (table: Tables, id: number) => Promise<StudySite[] | []>;
    loadAllUsers: () => Promise<void>;
    error: string | null;
    saveStudy: (table: Tables, studyData: Study) => Promise<Study>;
    saveSite: (table: Tables, siteData: StudySite) => Promise<StudySite>;
    saveUser: (table: Tables, siteData: StudyUser) => Promise<StudyUser>;
    currentStudyID: number | null;
    setCurrentStudyID: React.Dispatch<React.SetStateAction<number | null>>;
    currentSiteID: number | null;
    setCurrentSiteID: React.Dispatch<React.SetStateAction<number | null>>;

}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { studies, sites, setStudies, setSites, loadTable, loadTablePartial, loadAllUsers, error, saveStudy, saveSite, saveUser } = useStudies();

    const [currentStudyID, setCurrentStudyID] = useState<number | null>(null);
    const [currentSiteID, setCurrentSiteID] = useState<number | null>(null);

  return (
    <AdminContext value={{
      studies,
      sites,
      setStudies,
      setSites,
      loadTable,
      loadTablePartial,
      loadAllUsers,
      error,
      saveStudy,
      saveSite, saveUser, currentStudyID, setCurrentStudyID, currentSiteID, setCurrentSiteID }}>
      {children}
    </AdminContext>
  );
};