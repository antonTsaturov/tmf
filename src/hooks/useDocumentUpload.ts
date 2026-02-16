// hooks/useDocumentUpload.ts
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Study, StudySite } from '@/types/types';

interface UploadOptions {
  studyId: number | string; // Изменено с Study на number/string
  siteId: number | string;   // Изменено с StudySite на number/string
  folderId: string;
  folderName: string;
  createdBy: string;
  tmfZone: string | null;
  tmfArtifact: string | null;
  customFileName?: string;
}

interface UploadResult {
  success: boolean;
  document?: any;
  error?: string;
}

export const useDocumentUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Валидация
      if (!file) {
        throw new Error('No file provided');
      }

      // Проверка типа файла (опционально)
      // if (file.type !== 'application/pdf') {
      //   throw new Error('Only PDF files are allowed');
      // }

      // Генерируем ID
      const documentId = uuidv4();
      const versionId = uuidv4();

      // Формируем имя файла
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = options.customFileName 
        ? `${options.customFileName}.${fileExtension}`
        : file.name;

      // Создаем путь в S3
      const s3Key = `documents/${options.studyId}/site-${options.siteId}/${documentId}/v1/${versionId}.${fileExtension}`;

      // Создаем FormData для отправки
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentId', documentId);
      formData.append('versionId', versionId);
      formData.append('s3Key', s3Key);
      formData.append('studyId', String(options.studyId)); // Приводим к строке
      formData.append('siteId', String(options.siteId));   // Приводим к строке
      formData.append('folderId', options.folderId);
      formData.append('folderName', options.folderName);
      formData.append('createdBy', options.createdBy);
      formData.append('fileName', fileName);
      formData.append('fileSize', String(file.size));
      formData.append('fileType', file.type);
      
      if (options.tmfZone) {
        formData.append('tmfZone', options.tmfZone);
      }
      
      if (options.tmfArtifact) {
        formData.append('tmfArtifact', options.tmfArtifact);
      }

      // Симуляция прогресса (можно заменить на реальный прогресс с XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Отправляем запрос
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setProgress(100);

      return {
        success: true,
        document: result.document,
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    } finally {
      // Сбрасываем прогресс через секунду после завершения
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 1000);
    }
  };

  return {
    uploadFile,
    isUploading,
    progress,
  };
};