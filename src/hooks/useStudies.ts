// hooks/useStudies.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTable, getTablePartial, createOrUpdateTable } from '@/lib/api/fetch';
import { Study, StudySite, StudyUser } from '@/types/types';
import { Tables } from '@/lib/db/schema';



export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [sites, setSites] = useState<StudySite[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTable = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTable(Tables.STUDY);
      setStudies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load studies');
      console.error('Error loading studies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTablePartial = useCallback(async <T>(table: Tables, id: number): Promise<T[]> => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTablePartial(table, { studyId: id });
      
      // Если есть данные
      if (data) {
        // Всегда возвращаем массив
        if (Array.isArray(data)) {
          return data as T[];
        }
        // Если пришел одиночный объект, оборачиваем в массив
        return [data] as T[];
      }
      
      // Если данных нет, возвращаем пустой массив
      return [] as T[];
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${table}`);
      console.error(`Error loading ${table}:`, err);
      
      // В случае ошибки возвращаем пустой массив
      return [] as T[];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStudy = useCallback(async (table: Tables, studyData: Partial<Study>) => {
    //console.log('Saving study data:', studyData);
    try {
      setLoading(true);
      setError(null);
      const result = await createOrUpdateTable(table, studyData);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save study');
      console.error('Error saving study:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [studies]);

  const saveSite = useCallback(async (table: Tables, siteData: Partial<StudySite>) => {
    try {
      //setLoading(true);
      setError(null);
      const result = await createOrUpdateTable(table, siteData);
      return result;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save site');
      console.error('Error saving site: ', err);
      throw err;

    } finally {
      setLoading(false);
    }
  }, [sites]);

  const saveUser = useCallback(async (table: Tables, userData: Partial<StudyUser>) => {
    try {
      //setLoading(true);
      setError(null);
      const result = await createOrUpdateTable(table, userData);
      return result;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
      console.error('Error saving user: ', err);
      throw err;

    } finally {
      setLoading(false);
    }
  }, [sites]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  return {
    studies,
    sites,
    setStudies,
    setSites,
    loading,
    error,
    loadTable,
    saveStudy,
    saveSite,
    saveUser,
    loadTablePartial,
  };
}