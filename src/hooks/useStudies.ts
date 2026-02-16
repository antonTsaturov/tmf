// // hooks/useStudies.ts
// 'use client';

// import { useState, useEffect, useCallback } from 'react';
// import { getTable, getTablePartial, createOrUpdateTable } from '@/lib/api/fetch';
// import { Study, StudySite, StudyUser } from '@/types/types';
// import { Tables } from '@/lib/db/schema';
// import { useAuth } from '@/wrappers/AuthProvider';



// export function useStudies() {
//   const [studies, setStudies] = useState<Study[]>([]);
//   const [sites, setSites] = useState<StudySite[]>([]);
//   const { user } = useAuth();

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadTable = useCallback(async (table: Tables) => {

//     console.log(user)
//     if (!user) {
//       return;
//     }

//     try {
//       setLoading(true);
//       setError(null);
//       const data = await getTable(table);
//       table === Tables.STUDY && setStudies(data);
//       return data;
      
//     } catch (err) {
//       setError(err instanceof Error ? err.message : `Failed to load ${table}`);
//       console.error(`Error loading ${table}: `, err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const loadAllUsers = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const data = await getTable(Tables.USERS);
//       return data;
//       //setStudies(data);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to load users');
//       console.error('Error loading users table:', err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);


//   const loadTablePartial = useCallback(async <T>(table: Tables, id: number): Promise<T[]> => {
//     try {
//       setLoading(true);
//       setError(null);
//       const data = await getTablePartial(table, { studyId: id });
      
//       // Если есть данные
//       if (data) {
//         // Всегда возвращаем массив
//         if (Array.isArray(data)) {
//           return data as T[];
//         }
//         // Если пришел одиночный объект, оборачиваем в массив
//         return [data] as T[];
//       }
      
//       // Если данных нет, возвращаем пустой массив
//       return [] as T[];
      
//     } catch (err) {
//       setError(err instanceof Error ? err.message : `Failed to load ${table}`);
//       console.error(`Error loading ${table}:`, err);
      
//       // В случае ошибки возвращаем пустой массив
//       return [] as T[];
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const saveStudy = useCallback(async (table: Tables, studyData: Partial<Study>) => {
//     //console.log('Saving study data:', studyData);
//     try {
//       setLoading(true);
//       setError(null);
//       const result = await createOrUpdateTable(table, studyData);
//       return result;
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to save study');
//       console.error('Error saving study:', err);
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   }, [studies]);

//   const saveSite = useCallback(async (table: Tables, siteData: Partial<StudySite>) => {
//     try {
//       //setLoading(true);
//       setError(null);
//       const result = await createOrUpdateTable(table, siteData);
//       return result;

//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to save site');
//       console.error('Error saving site: ', err);
//       throw err;

//     } finally {
//       setLoading(false);
//     }
//   }, [sites]);

//   const saveUser = useCallback(async (table: Tables, userData: Partial<StudyUser>) => {
//     try {
//       //setLoading(true);
//       setError(null);
//       const result = await createOrUpdateTable(table, userData);
//       return result;

//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to save user');
//       console.error('Error saving user: ', err);
//       throw err;

//     } finally {
//       setLoading(false);
//     }
//   }, [sites]);

//   useEffect(() => {
//     loadTable(Tables.STUDY);
//   }, [loadTable]);

//   return {
//     studies,
//     sites,
//     setStudies,
//     setSites,
//     loading,
//     error,
//     loadTable,
//     saveStudy,
//     saveSite,
//     saveUser,
//     loadTablePartial,
//     loadAllUsers
//   };
// }

// hooks/useStudies.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTable, getTablePartial, createOrUpdateTable } from '@/lib/api/fetch';
import { Study, StudySite, StudyUser } from '@/types/types';
import { Tables } from '@/lib/db/schema';
import { useAuth } from '@/wrappers/AuthProvider';

export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [sites, setSites] = useState<StudySite[]>([]);
  const { user, loading: authLoading } = useAuth(); // Добавьте isLoading из AuthProvider

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTable = useCallback(async (table: Tables) => {
    console.log('Current user:', user);
    
    if (!user) {
      console.log('User is null, skipping load');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getTable(table);
      if (table === Tables.STUDY) {
        setStudies(data);
      }
      return data;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${table}`);
      console.error(`Error loading ${table}: `, err);
    } finally {
      setLoading(false);
    }
  }, [user]); // Добавьте user в зависимости

  // Загружаем исследования только когда пользователь загружен
  useEffect(() => {
    if (!authLoading && user) {
      loadTable(Tables.STUDY);
    }
  }, [authLoading, user, loadTable]);

  // Остальные методы остаются без изменений
  const loadAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTable(Tables.USERS);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users table:', err);
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
      console.error(`Error loading ${table}:`, err);
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
      console.error('Error saving study:', err);
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
      console.error('Error saving site: ', err);
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
      console.error('Error saving user: ', err);
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