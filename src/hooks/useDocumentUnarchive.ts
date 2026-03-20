// hooks/useDocumentUnarchive.ts
import { useState } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';

interface UnarchiveDocumentResult {
  success: boolean;
  error?: string;
  data?: any;
}

interface UseDocumentUnarchiveReturn {
  unarchiveDocument: (documentId: string | number, unarchiveReason: string) => Promise<UnarchiveDocumentResult>;
  isUnarchiving: boolean;
  error: string | null;
}

export const useDocumentUnarchive = (): UseDocumentUnarchiveReturn => {
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const unarchiveDocument = async (
    documentId: string | number,
    unarchiveReason: string
  ): Promise<UnarchiveDocumentResult> => {
    setIsUnarchiving(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/unarchive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
          docId: documentId,
          unarchiveReason
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unarchive document');
      }

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUnarchiving(false);
    }
  };

  return {
    unarchiveDocument,
    isUnarchiving,
    error,
  };
};
