// hooks/useStudiesAndSites.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';

interface Study {
  id: number;
  title: string;
  protocol: string;
  status: string;
}

interface Site {
  id: string | number;
  name: string;
  number: number;
  study_id: number;
  status: string;
}

interface UseStudiesAndSitesReturn {
  studies: Map<number, Study>;
  sites: Map<string | number, Site>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getStudyName: (studyId: number) => string;
  getStudyProtocol: (studyId: number) => string;
  getSiteName: (siteId: string | number | null) => string;
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
      console.error('Error fetching studies:', err);
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
      console.error('Error fetching sites:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sites');
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStudies(), fetchSites()]);
    } catch (err) {
      console.error('Error refreshing data:', err);
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

  const getSiteName = useCallback((siteId: string | number | null): string => {
    if (!siteId) return 'General Level Document';
    const site = sites.get(siteId);
    return site?.name || `Центр ${siteId}`;
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