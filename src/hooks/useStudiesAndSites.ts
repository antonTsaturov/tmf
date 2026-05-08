// hooks/useStudiesAndSites.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';
import { Study } from '@/types/types';
import { logger } from '@/lib/utils/logger';
import { Document } from '@/types/document';
import { ViewLevel } from '@/types/types';


// interface Study {
//   id: number;
//   title: string;
//   protocol: string;
//   status: string;
// }

interface Site {
  id: string | number;
  name: string;
  number: number;
  study_id: number;
  status: string;
  country: string;
}

interface UseStudiesAndSitesReturn {
  studies: Map<number, Study>;
  sites: Map<string | number, Site>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getStudyName: (studyId: number) => string;
  getStudyProtocol: (studyId: number) => string;
  getSiteName: (doc: Document) => string;
}

export const useStudiesAndSites = (): UseStudiesAndSitesReturn => {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Map<number, Study>>(new Map());
  const [sites, setSites] = useState<Map<string | number, Site>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudies = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/study');
      if (!response.ok) throw new Error('Failed to fetch studies');
      
      const studiesData: Study[] = await response.json();
      const studiesMap = new Map(studiesData.map(study => [study.id, study]));
      setStudies(studiesMap);
    } catch (err) {
      logger.error('Error fetching studies', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch studies');
    }
  }, [user]);

  const fetchSites = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/site');
      if (!response.ok) throw new Error('Failed to fetch sites');
      
      const sitesData: Site[] = await response.json();
      const sitesMap = new Map(sitesData.map(site => [site.id, site]));
      setSites(sitesMap);
    } catch (err) {
      logger.error('Error fetching sites', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sites');
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStudies(), fetchSites()]);
    } catch (err) {
      logger.error('Error refreshing studies and sites data', err);
    } finally {
      setLoading(false);
    }
  }, [fetchStudies, fetchSites]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getStudyName = useCallback((studyId: number): string => {
    const study = studies.get(studyId);
    return study?.title || `Исследование ${studyId}`;
  }, [studies]);

  const getStudyProtocol = useCallback((studyId: number): string => {
    const study = studies.get(studyId);
    return study?.protocol || `Протокол ${studyId}`;
  }, [studies]);

  const getSiteName = useCallback((doc: Document): string => {
    // Определяем уровень документа по Folder ID
    // Folder ID имеет вид "ViewLevel-UUID"
    const docLevel = doc.folder_id.split('-', 1)[0];
    if (docLevel === ViewLevel.GENERAL) {
      return 'General Level Document';

    }
    if (docLevel === ViewLevel.SITE) {
      const site = sites.get(String(doc.site_id));
      return site?.name || `Центр ${String(doc.site_id)}`;

    }
    if (docLevel === ViewLevel.COUNTRY) {
      const country = doc.country;
      return `Country Level Document (${country || 'Unknown'})`;

    }
    return docLevel;
  }, [sites]);

  return {
    studies,
    sites,
    loading,
    error,
    refresh,
    getStudyName,
    getStudyProtocol,
    getSiteName
  };
};