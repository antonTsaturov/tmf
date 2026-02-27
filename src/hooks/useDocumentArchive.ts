// hooks/useDocumentArchive.ts
import { useState } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';

interface ArchiveDocumentResult {
  success: boolean;
  error?: string;
  data?: any;
}

interface UseDocumentArchiveReturn {
  archiveDocument: (documentId: string | number) => Promise<ArchiveDocumentResult>;
  isArchiving: boolean;
  error: string | null;
}

export const useDocumentArchive = (): UseDocumentArchiveReturn => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const archiveDocument = async (documentId: string | number): Promise<ArchiveDocumentResult> => {
    setIsArchiving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive document');
      }
      
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsArchiving(false);
    }
  };

  return {
    archiveDocument,
    isArchiving,
    error,
  };
};