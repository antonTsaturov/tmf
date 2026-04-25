// // hooks/useStudies.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTable, getTablePartial, createOrUpdateTable } from '@/lib/api/fetch';
import { Study, StudySite, StudyUser } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { useAuth } from '@/wrappers/AuthProvider';
import { logger } from '@/lib/utils/logger';

export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [sites, setSites] = useState<StudySite[]>([]);
  const { user, loading: authLoading } = useAuth(); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFetching = useRef(false);

  const loadTable = useCallback(async (table: Tables) => {
    // Если уже грузим или данные есть — выходим
    //if (isFetching.current || studies.length > 0 || !user) return;

    try {
      isFetching.current = true; // Блокируем повторные вызовы
      setLoading(true);
      const data = await getTable(table);
      if (table === Tables.STUDY) {
        setStudies(data);
      }
      return data;
    } catch (err) {
      logger.error('Error loading data', err);
    } finally {
      setLoading(false);
      isFetching.current = false; // Разблокируем после завершения
    }
    
  }, [user?.id, studies.length]); // Следим за длиной массива


  // Загружаем исследования только когда пользователь загружен
  useEffect(() => {
    // Выполняем загрузку только один раз при наличии пользователя
    if (!authLoading && user && studies.length === 0 && !isFetching.current) {
      loadTable(Tables.STUDY);
    }
  }, [authLoading, user, loadTable, studies.length]);

  const loadAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTable(Tables.USERS);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      logger.error('Error loading users table', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTablePartial = useCallback(async <T>(table: Tables, id: number): Promise<T[]> => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTablePartial(table, { studyId: id });
      
      if (data) {
        if (Array.isArray(data)) {
          return data as T[];
        }
        return [data] as T[];
      }
      
      return [] as T[];
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${table}`);
      logger.error(`Error loading ${table}`, err);
      return [] as T[];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStudy = useCallback(async (table: Tables, studyData: Partial<Study>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await createOrUpdateTable(table, studyData);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save study');
      logger.error('Error saving study', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSite = useCallback(async (table: Tables, siteData: Partial<StudySite>) => {
    try {
      setError(null);
      const result = await createOrUpdateTable(table, siteData);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save site');
      logger.error('Error saving site', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUser = useCallback(async (table: Tables, userData: Partial<StudyUser>) => {
    try {
      setError(null);
      const result = await createOrUpdateTable(table, userData);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
      logger.error('Error saving user', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    studies,
    sites,
    setStudies,
    setSites,
    loading: loading || authLoading, // Комбинируем состояния загрузки
    error,
    loadTable,
    saveStudy,
    saveSite,
    saveUser,
    loadTablePartial,
    loadAllUsers,
    isAuthenticated: !!user, // Добавляем флаг аутентификации
  };
}