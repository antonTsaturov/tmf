// hooks/usePDFCache.ts
import { useState, useCallback } from 'react';

interface CachedPDF {
  id: string;
  data: ArrayBuffer;
  timestamp: number;
  etag: string;
  documentName: string;
}

const DB_NAME = 'pdf-cache';
const STORE_NAME = 'pdfs';
const DB_VERSION = 1;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 дней

// Включаем отладку
const DEBUG = false;

export const usePDFCache = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Object>({});

  const log = useCallback((...args: any[]) => {
    if (DEBUG) {
      console.log('📦 [PDF Cache]:', ...args);
    }
  }, []);

  const logError = useCallback((...args: any[]) => {
    if (DEBUG) {
      console.error('❌ [PDF Cache Error]:', ...args);
    }
  }, []);

  const initDB = useCallback((): Promise<IDBDatabase> => {
    log('Initializing database...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        const error = request.error;
        logError('Failed to open database:', error);
        reject(error);
      };

      request.onsuccess = (event) => {
        const db = request.result;
        log('Database opened successfully', {
          name: db.name,
          version: db.version,
          objectStoreNames: Array.from(db.objectStoreNames)
        });
        setIsInitialized(true);
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        log('Database upgrade needed. Current version:', event.oldVersion);
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          log('Creating object store:', STORE_NAME);
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          log('Object store created with index on timestamp');
        }
      };
    });
  }, [log, logError]);

  const getAllCachedPDFs = useCallback(async (): Promise<CachedPDF[]> => {
    log('Getting all cached PDFs...');
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => {
          logError('Failed to get all cached PDFs:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          const cached = request.result as CachedPDF[];
          log(`Found ${cached.length} cached files`);
          if (cached.length > 0) {
            cached.forEach((file, i) => {
              log(`  [${i + 1}] ${file.documentName} - ${(file.data.byteLength / 1024).toFixed(2)} KB - ${new Date(file.timestamp).toLocaleString()}`);
            });
          }
          resolve(cached);
        };
      });
    } catch (error) {
      logError('Error in getAllCachedPDFs:', error);
      return [];
    }
  }, [initDB, log, logError]);

  const getCachedPDF = useCallback(async (documentId: string): Promise<CachedPDF | null> => {
    log(`Getting cached PDF for document: ${documentId}`);
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(documentId);

        request.onerror = () => {
          logError('Failed to get cached PDF:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          const cached = request.result as CachedPDF;
          if (cached) {
            const age = Date.now() - cached.timestamp;
            const ageHours = Math.floor(age / (1000 * 60 * 60));
            log(`Found cached PDF:`, {
              name: cached.documentName,
              sizeKB: (cached.data.byteLength / 1024).toFixed(2),
              age: `${ageHours} hours`,
              timestamp: new Date(cached.timestamp).toLocaleString(),
              etag: cached.etag
            });

            if (age < CACHE_DURATION) {
              log('Cache is still valid');
              resolve(cached);
            } else {
              log('Cache expired, deleting...');
              deleteCachedPDF(documentId);
              resolve(null);
            }
          } else {
            log('No cached PDF found');
            resolve(null);
          }
        };
      });
    } catch (error) {
      logError('Error getting cached PDF:', error);
      return null;
    }
  }, [initDB, log, logError]);

  const cachePDF = useCallback(async (documentId: string, data: ArrayBuffer, etag: string, documentName: string) => {
    log(`Attempting to cache PDF: ${documentName} (${documentId})`);
    log(`Data size: ${(data.byteLength / 1024).toFixed(2)} KB`);
    log(`ETag: ${etag}`);

    try {
      // Проверяем размер данных
      if (data.byteLength === 0) {
        logError('Cannot cache empty data');
        return false;
      }

      const db = await initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const cachedPDF: CachedPDF = {
          id: documentId,
          data,
          timestamp: Date.now(),
          etag,
          documentName,
        };

        log('Putting data into store...');
        const request = store.put(cachedPDF);

        request.onerror = (event) => {
          logError('Failed to cache PDF:', request.error);
          setDebugInfo(prev => ({ ...prev, lastError: request.error }));
          reject(request.error);
        };

        request.onsuccess = (event) => {
          log('✅ PDF successfully cached!');
          
          // Проверяем, что данные действительно сохранились
          setTimeout(async () => {
            const verify = await getCachedPDF(documentId);
            if (verify) {
              log('✅ Cache verification successful');
            } else {
              logError('❌ Cache verification failed - data not found after save');
            }
          }, 100);

          resolve(true);
        };

        transaction.oncomplete = () => {
          log('Transaction completed');
        };

        transaction.onerror = (event) => {
          logError('Transaction error:', transaction.error);
        };
      });
    } catch (error) {
      logError('Error caching PDF:', error);
      return false;
    }
  }, [initDB, log, logError, getCachedPDF]);

  const deleteCachedPDF = useCallback(async (documentId: string) => {
    log(`Deleting cached PDF: ${documentId}`);
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(documentId);

        request.onerror = () => {
          logError('Failed to delete cached PDF:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          log('PDF deleted from cache');
          resolve(true);
        };
      });
    } catch (error) {
      logError('Error deleting cached PDF:', error);
    }
  }, [initDB, log, logError]);

  const clearOldCache = useCallback(async () => {
    log('Clearing old cache entries...');
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      
      const cutoff = Date.now() - CACHE_DURATION;
      const range = IDBKeyRange.upperBound(cutoff);
      
      let deletedCount = 0;
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(range);
        
        request.onerror = () => {
          logError('Failed to clear old cache:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            log(`Deleting old cache entry: ${cursor.value.documentName}`);
            store.delete(cursor.primaryKey);
            deletedCount++;
            cursor.continue();
          } else {
            log(`Cleared ${deletedCount} old cache entries`);
            resolve(true);
          }
        };
      });
    } catch (error) {
      logError('Error clearing old cache:', error);
    }
  }, [initDB, log, logError]);

  const getCacheStats = useCallback(async () => {
    log('Getting cache stats...');
    try {
      const all = await getAllCachedPDFs();
      const totalSize = all.reduce((acc, pdf) => acc + pdf.data.byteLength, 0);
      const now = Date.now();
      
      const stats = {
        totalFiles: all.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2) + ' MB',
        files: all.map(pdf => ({
          id: pdf.id,
          documentName: pdf.documentName,
          sizeKB: (pdf.data.byteLength / 1024).toFixed(2) + ' KB',
          cachedAt: new Date(pdf.timestamp).toLocaleString(),
          ageHours: Math.floor((now - pdf.timestamp) / (1000 * 60 * 60)),
          etag: pdf.etag,
        })),
      };
      
      log('Cache stats:', stats);
      return stats;
    } catch (error) {
      logError('Error getting cache stats:', error);
      return null;
    }
  }, [getAllCachedPDFs, log, logError]);

  const checkDatabaseExists = useCallback(async () => {
    log('Checking if database exists...');
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME);
      
      request.onsuccess = (event) => {
        const db = request.result;
        const exists = db.objectStoreNames.contains(STORE_NAME);
        log(`Database exists: ${exists}`);
        db.close();
        resolve(exists);
      };
      
      request.onerror = () => {
        logError('Failed to check database');
        resolve(false);
      };
    });
  }, [log, logError]);

  const deleteDatabase = useCallback(async () => {
    log('Deleting database...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      
      request.onsuccess = () => {
        log('Database deleted successfully');
        setIsInitialized(false);
        resolve(true);
      };
      
      request.onerror = () => {
        logError('Failed to delete database:', request.error);
        reject(request.error);
      };
    });
  }, [log, logError]);

  return {
    getCachedPDF,
    cachePDF,
    deleteCachedPDF,
    clearOldCache,
    getAllCachedPDFs,
    getCacheStats,
    checkDatabaseExists,
    deleteDatabase,
    debugInfo,
    isInitialized,
  };
};