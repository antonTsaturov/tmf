// wrappers/ReportContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { ReportType, ReportFilter, ReportMeta } from '@/types/reports.type';
import { AuditReportRequest } from '@/types/reports.type';

type ReportContextState = {
  selectedReport: ReportType | null;
  selectedFilter: ReportFilter | null;
  isLoading: boolean;
  data: any[];
  hasGenerated: boolean;
  meta: ReportMeta;
  request: AuditReportRequest | null;
};

type ReportContextType = {
  reportContext: ReportContextState;
  updateReportContext: (updates: Partial<ReportContextState>) => void;
  clearReportContext: () => void;
};

const initialState: ReportContextState = {
  selectedReport: null,
  selectedFilter: null,
  isLoading: false,
  data: [],
  hasGenerated: false,
  meta: null,
  request: null,
};

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reportContext, setReportContext] = useState<ReportContextState>(initialState);
  const isUpdatingRef = useRef(false);

  const updateReportContext = useCallback((updates: Partial<ReportContextState>) => {
    // Предотвращаем множественные обновления
    if (isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    setReportContext(prev => ({
      ...prev,
      ...updates,
    }));
    
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  }, []);

  const clearReportContext = useCallback(() => {
    setReportContext(initialState);
  }, []);

  return (
    <ReportContext.Provider
      value={{
        reportContext,
        updateReportContext,
        clearReportContext,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReportContext() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReportContext must be used within a ReportProvider');
  }
  return context;
}