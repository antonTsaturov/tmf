// hooks/useCopyDocumentLink.ts
import { useCallback, useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { useNotification } from '@/wrappers/NotificationContext';
import { Document } from '@/types/document';

interface UseCopyDocumentLinkReturn {
  copyDocumentLink: (d: Document) => Promise<boolean>;
  isCopying: boolean;
}

export const useCopyDocumentLink = (): UseCopyDocumentLinkReturn => {
  const { addNotification } = useNotification();
  const [isCopying, setIsCopying] = useState(false);
  

  const getDocumentLink = useCallback(async (doc: Document): Promise<string | null> => {

    try {
      const currentOrigin = window.location.origin;      
      const link = `${currentOrigin}/share/${doc?.study_id}/${doc?.country}/${doc?.site_id}/${doc?.folder_id}/${doc?.id}`;
      return link;
    } catch (error) {
      logger.error('Error generating document link', error);
      console.log('Error generating document link', error)
      return null;
    }
  }, []);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // Современный способ (поддерживается во всех современных браузерах)
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback для старых браузеров
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch (fallbackError) {
        logger.error('Failed to copy to clipboard', fallbackError);
        return false;
      }
    }
  };

  const copyDocumentLink = async (doc: Document | null): Promise<boolean> => {
    const document = doc;
    
    if (!document) {
      logger.warn('No document selected for link copy');
      addNotification('error', 'Не выбран документ для копирования ссылки');
      return false;
    }

    setIsCopying(true);

    try {
      // Получаем ссылку на документ
      const link = await getDocumentLink(doc);
      
      if (!link) {
        throw new Error('Failed to generate link');
      }

      // Копируем в буфер обмена
      const copied = await copyToClipboard(link);
      
      if (copied) {
        addNotification('success', 'Ссылка на документ скопирована в буфер обмена');
        return true;
      } else {
        throw new Error('Failed to copy to clipboard');
      }
    } catch (error) {
      logger.error('Error copying document link', error);
      addNotification('error', 'Не удалось скопировать ссылку на документ');
      return false;
    } finally {
      setIsCopying(false);
    }
  };

  return {
    copyDocumentLink,
    isCopying,
  };
};