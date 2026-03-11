// hooks/useRename.ts
import { useState, useCallback, useContext } from 'react';
import { Document } from '@/types/document';
import { MainContext } from '@/wrappers/MainContext';
import { useAuth } from '@/wrappers/AuthProvider';

interface RenameResult {
  success: boolean;
  document?: Document;
  error?: string;
}

interface UseRenameReturn {
  renameDocument: (documentId: string, newTitle: string) => Promise<RenameResult>;
  isRenaming: boolean;
  error: string | null;
}

export const useRename = (): UseRenameReturn => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateContext } = useContext(MainContext)!;
  const { user } = useAuth()!;

  // Rename document
  const renameDocument = useCallback(async (documentId: string, newTitle: string): Promise<RenameResult> => {
    setIsRenaming(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newTitle: newTitle,
          userId: user?.id // Pass current user ID
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to rename document');
      }

      // Return the updated document
      return {
        success: true,
        document: data.document,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsRenaming(false);
    }
  }, [user?.id]);

  return {
    renameDocument,
    isRenaming,
    error,
  };
};
