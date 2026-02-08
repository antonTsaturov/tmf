// hooks/useStudies.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTable, getTablePartial, createOrUpdateTable } from '@/lib/api/fetch';
import { Study, StudySite } from '@/types/types';
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


const loadTablePartial = useCallback(async (table: Tables, id: number): Promise<StudySite | StudySite[] | []> => {
  try {
    setLoading(true);
    setError(null);
    const data = await getTablePartial(table, { studyId: id });
    
    // Если есть данные
    if (data) {
      // Если это массив
      if (Array.isArray(data)) {
        return data as StudySite[];
      }
      // Если это одиночный объект
      return data as StudySite;
    }
    
    // Если данных нет, возвращаем пустой массив
    return [];
    
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load sites');
    console.error('Error loading sites:', err);
    
    // В случае ошибки возвращаем пустой массив
    return [];
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
      if (table === 'study') {
        await loadTable(); // Перезагрузить список после сохранения
      }
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
      setError(err instanceof Error ? err.message : 'Failed to save sites list');
      console.error('Error saving sites list:', err);
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
    loadTablePartial,
  };
}