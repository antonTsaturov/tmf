// // hooks/useDocumentUpload.ts
import { useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getDocumentVersionS3Key } from '@/lib/cloud/s3-path';
import { useAuth } from '@/wrappers/AuthProvider';
import { MainContext } from '@/wrappers/MainContext';
import { useNotification } from '@/wrappers/NotificationContext';
import { useUpload } from '@/wrappers/UploadContext';
import { Document as DocumentVersion } from '@/types/document';
import { logger } from '@/lib/utils/logger';

type ProgressCallback = (index: number, progress: number, document?: any) => void;

// Добавляем интерфейс для FileItem
interface FileItem {
  file: File;
  customName: string;
  isEditing: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  document?: any;
}

interface UploadOptions {
  studyId: string; 
  siteId?: string | null;
  folderId: string;
  //folderName: string;
  createdBy: string | number;
  tmfZone: string | null;
  tmfArtifact: string | null;
  customFileName?: string;
  country?: string;
}

interface UploadResult {
  success: boolean;
  document?: any;
  documents?: any[];
  error?: string;
}

export const useDocumentUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();
  const { context, updateContext } = useContext(MainContext)!;
  const { selectedFolder, currentStudy, currentSite, selectedDocument} = context;
  const { addNotification } = useNotification();
  const upload = useUpload();
  const setPreview = upload.setFilePreview;

  // Выбор файлов для загрузки через кнопку "Создать"
  const handleFileSelect = () => {
    if (!selectedFolder) {
      addNotification('error', 'Сначала выберите папку');
      return;
    }

    if (!user?.id) {
      addNotification('error', 'Пользователь не авторизован');
      return;
    }

    const ALLOWED_TYPES = ['.pdf', '.txt'];
    const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf,.txt,text/plain';
    input.multiple = true;

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;

      if (!files || files.length === 0) return;

      // Validate file types
      const invalidFiles: { name: string; type: string }[] = [];
      const validFiles: File[] = [];

      Array.from(files).forEach(file => {
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        const isValidType = ALLOWED_TYPES.includes(fileExtension) || 
                           ALLOWED_MIME_TYPES.includes(file.type);
        
        if (!isValidType) {
          invalidFiles.push({ name: file.name, type: file.type || 'unknown' });
        } else {
          validFiles.push(file);
        }
      });

      if (invalidFiles.length > 0) {
        const fileNames = invalidFiles.map(f => f.name).join(', ');
        logger.warn('File type validation failed', { 
          invalidFiles: invalidFiles.map(f => ({ name: f.name, type: f.type })),
          allowedTypes: ALLOWED_TYPES.join(', ')
        });
        addNotification(
          'error', 
          `Недопустимый тип файлов: ${fileNames}. Разрешены только PDF файлы.`
        );
        if (validFiles.length === 0) {
          input.remove();
          return;
        }
      }

      const filesArray = validFiles.length > 0 ? validFiles : Array.from(files);

      setPreview({
        files: filesArray,
        folderId: selectedFolder.id,
        //folderName: selectedFolder.name,
        size: filesArray.reduce((total, file) => total + file.size, 0),
        customName: filesArray.length === 1
          ? filesArray[0].name.replace(/\.[^/.]+$/, '')
          : `${filesArray.length} файлов`,
        studyId: currentStudy?.id!,
        siteId: currentSite?.id!,
        country: context.currentCountry,
        createdBy: user.id,
        ...(filesArray.length === 1 && { file: filesArray[0] })
      });

      input.remove();
    };
    
    input.click();
  };


  // Функция для загрузки нескольких файлов
  const uploadMultipleFiles = async (
    files: File[] | FileItem[], 
    options: UploadOptions,
    onProgress?: ProgressCallback  // Новый параметр
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress(0);
    
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      const uploadedDocuments = [];
      const totalFiles = files.length;
      const isFileItems = files.length > 0 && 'customName' in files[0];

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        
        let file: File;
        let customFileName: string | undefined;
        
        if (isFileItems) {
          const fileItem = item as FileItem;
          file = fileItem.file;
          customFileName = fileItem.customName;
        } else {
          file = item as File;
          customFileName = options.customFileName;
        }

        const documentId = uuidv4();
        const versionId = uuidv4();
        const fileExtension = file.name.split('.').pop() || '';
        const fileName = customFileName ? `${customFileName}.${fileExtension}` : file.name;
        const documentName = customFileName || file.name.replace(/\.[^/.]+$/, '');

        const s3Key = getDocumentVersionS3Key(
          options.studyId,
          options.folderId,
          documentId,
          1,
          versionId,
          fileExtension
        );

        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentId', documentId);
        formData.append('versionId', versionId);
        formData.append('s3Key', s3Key);
        formData.append('studyId', String(options.studyId));
        formData.append('folderId', options.folderId);
        //formData.append('folderName', options.folderName);
        formData.append('createdBy', String(options.createdBy));
        formData.append('fileName', fileName);
        formData.append('documentName', documentName);
        formData.append('fileSize', String(file.size));
        formData.append('fileType', file.type);
        formData.append('status', 'draft');
        
        if (options.siteId) formData.append('siteId', String(options.siteId));
        if (options.country) formData.append('country', options.country);
        if (options.tmfZone) formData.append('tmfZone', options.tmfZone);
        if (options.tmfArtifact) formData.append('tmfArtifact', options.tmfArtifact);

        // 🎯 Симуляция прогресса для текущего файла
        let fileProgress = 0;
        const progressInterval = setInterval(() => {
          fileProgress = Math.min(fileProgress + 15, 90);
          onProgress?.(i, fileProgress); // Обновляем прогресс конкретного файла
        }, 100);

        try {
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
          
          // ✅ Файл загружен — ставим 100%
          onProgress?.(i, 100, result.documents?.[0]);
          
          if (result.documents?.[0]) {
            uploadedDocuments.push(result.documents[0]);
          }

          // 🎯 Обновляем общий прогресс
          const overallProgress = Math.round(((i + 1) / totalFiles) * 100);
          setProgress(overallProgress);

        } catch (fileError) {
          clearInterval(progressInterval);
          onProgress?.(i, 0);
          
          // Log with more context
          //const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
          logger.error('File upload failed', fileError, {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            documentId,
            folderId: options.folderId
          });
          
          throw fileError;
        }
      }

      return {
        success: true,
        documents: uploadedDocuments,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Document upload error', error, { 
        filesCount: files.length,
        folderId: options.folderId,
        studyId: options.studyId 
      });
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Функция для загрузки новой версии документа
  const handleUploadNewVersion = () => {
    if (!selectedDocument) {
      addNotification('error', 'Выберите документ');
      return;
    }
    if (!user?.id && !user?.email) {
      addNotification('error', 'Пользователь не авторизован');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf,.txt,text/plain';
    input.multiple = false;

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const preview = { file, document: selectedDocument as DocumentVersion};
      if (typeof upload.setNewVersion === 'function') {
        upload.setNewVersion(preview);
        updateContext({ isNewVersionPanelOpen: true });
      } 
      input.remove();
    };

    input.click();
  };  

  return {
    handleFileSelect,
    handleUploadNewVersion,
    uploadMultipleFiles,
    isUploading,
    progress,
  };
};