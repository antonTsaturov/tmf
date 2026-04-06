// hooks/useDocumentNewVersion.ts
// новый хук, который передает в компонент только обновленный номер версии документа
import { useState } from 'react';
import { Document } from '@/types/document';
import { logger } from '@/lib/utils/logger';

interface NewVersionUploadResult {
  success: boolean;
  version?: any; // Теперь возвращаем версию, так как API возвращает именно её
  error?: string;
}

export const useDocumentNewVersion = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadNewVersion = async (
    document: Document,
    file: File,
    options: {
      createdBy: string;
      changeReason?: string;
      resetStatusToDraft?: boolean;
      customFileName?: string;
      siteId?: string;
      studyId: string; 
    }
  ): Promise<NewVersionUploadResult> => {
    setIsUploading(true);
    setProgress(0);

    try {
      if (!file || !document?.id) {
        throw new Error('Документ и файл обязательны');
      }

      const fileExtension = file.name.split('.').pop() || '';
      const fileName = options.customFileName
        ? `${options.customFileName}.${fileExtension}`
        : file.name;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', options.createdBy);
      formData.append('fileName', fileName);
      formData.append('documentName', options.customFileName ?? file.name.replace(/\.[^/.]+$/, ''));
      formData.append('fileSize', String(file.size));
      formData.append('fileType', file.type);
      formData.append('siteId', String(options.siteId));
      formData.append('studyId', String(options.studyId));
      
      if (options.changeReason) {
        formData.append('changeReason', options.changeReason);
      }
      // Примечание: API в route.ts не обрабатывает resetStatusToDraft напрямую в текущей версии,
      // но значение передается в formData для аудита или будущих расширений.
      formData.append('resetStatusToDraft', String(options.resetStatusToDraft ?? true));

      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 200);

      const response = await fetch(`/api/documents/${document.id}/versions`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Ошибка загрузки новой версии');
      }

      // 🔹 Получаем результат, соответствующий новой структуре route.ts
      const result = await response.json();

      return {
        success: true,
        version: result.version.document_number, // возвращается только номер версии
      };
    } catch (error) {
      logger.error('New version upload error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 1000);
    }
  };

  return { uploadNewVersion, isUploading, progress };
};