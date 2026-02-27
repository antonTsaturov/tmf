// hooks/useDocumentDelete.ts
import { useState, useCallback, useContext } from 'react';
import { Document } from '@/types/document';
import { MainContext} from '@/wrappers/MainContext';
import { useAuth } from '@/wrappers/AuthProvider';

interface DeleteResult {
  success: boolean;
  document?: Document;
  error?: string;
}

interface UseDocumentDeleteReturn {
  deleteDocument: (documentId: string, reason: string) => Promise<DeleteResult>;
  restoreDocument: (documentId: string) => Promise<DeleteResult>;
  isDeleting: boolean;
  isRestoring: boolean;
  error: string | null;
}

export const useDocumentDelete = (): UseDocumentDeleteReturn => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateContext } = useContext(MainContext)!;
  const { user } = useAuth()!;

  // Мягкое удаление документа
  const deleteDocument = useCallback(async (documentId: string, reason: string): Promise<DeleteResult> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reason: reason,
          userId: user?.id // Передаем ID текущего пользователя
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete document');
      }

      updateContext({docWasDeleted: true});
      return {
        success: true,
        document: data.document,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Восстановление документа
  const restoreDocument = useCallback(async (documentId: string): Promise<DeleteResult> => {
    setIsRestoring(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}?action=restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore document');
      }

      return {
        success: true,
        document: data.document,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return {
    deleteDocument,
    restoreDocument,
    isDeleting,
    isRestoring,
    error,
  };
};