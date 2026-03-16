// hooks/useDocumentRestore.ts
import { useState, useCallback } from 'react';
import { Document } from '@/types/document';
import { useAuth } from '@/wrappers/AuthProvider';

interface RestoreResult {
  success: boolean;
  document?: Document;
  error?: string;
}

interface UseDocumentRestoreReturn {
  restoreDocument: (documentId: string, reason?: string) => Promise<RestoreResult>;
  isRestoring: boolean;
  error: string | null;
}

export const useDocumentRestore = (): UseDocumentRestoreReturn => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const restoreDocument = useCallback(async (
    documentId: string,
    reason?: string
  ): Promise<RestoreResult> => {
    setIsRestoring(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user?.id,
          reason: reason
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore document');
      }

      return {
        success: true,
        document: data.document,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsRestoring(false);
    }
  }, [user?.id]);

  return {
    restoreDocument,
    isRestoring,
    error,
  };
};
