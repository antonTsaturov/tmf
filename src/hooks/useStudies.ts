// hooks/useStudies.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStudies, createOrUpdateStudy } from '@/lib/api/fetchStudy';
import { Study } from '@/types/types';


export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudies();
      setStudies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load studies');
      console.error('Error loading studies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStudy = useCallback(async (studyData: Study) => {
    console.log('Saving study data:', studyData);
    try {
      setLoading(true);
      setError(null);
      const result = await createOrUpdateStudy(studyData);
      await loadStudies(); // Перезагрузить список после сохранения
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save study');
      console.error('Error saving study:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [studies]);

  useEffect(() => {
    loadStudies();
  }, [loadStudies]);

  return {
    studies,
    setStudies,
    loading,
    error,
    loadStudies,
    saveStudy,
  };
}