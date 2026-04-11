// contexts/UploadContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Document } from '@/types/document';

export interface FilePreview {
  files: File[];
  file?: File; // для обратной совместимости
  folderId: string;
  //folderName: string;
  size: number;
  customName: string;
  studyId: number;
  siteId: string | number;
  createdBy: string | number;
  country?: string;
}

// Интерфейс для загрузки новой версии документа
export interface NewVersionPreview {
  file: File;
  document: Document;
}

export type UploadMode = 'single' | 'bulk' | undefined;

interface UploadContextType {
  // Состояния
  filePreview: FilePreview | null;
  isPreviewOpen: boolean;
  uploadMode: UploadMode;
  isUploading: boolean;
  uploadProgress: number;
  uploadedCount: number;
  totalFiles: number;
  newVersionPreview: NewVersionPreview | null;
  
  // Основные функции
  setFilePreview: (preview: FilePreview | FilePreview[] | null) => void;
  clearFilePreview: () => void;
  
  // Функции для работы с несколькими файлами
  addFilesToPreview: (newFiles: File[]) => void;
  removeFileFromPreview: (index: number) => void;
  removeSelectedFiles: (indices: number[]) => void;
  
  // Функции для управления загрузкой
  setUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setUploadedCount: (count: number | ((prev: number) => number)) => void;
  resetUploadState: () => void;
  
  // Функции для обновления метаданных
  updatePreviewMetadata: (updates: Partial<FilePreview>) => void;
  
  // Функции управления новыми версиями
  setNewVersion: (preview: NewVersionPreview | null) => void;
  clearNewVersion: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [filePreview, setFilePreviewState] = useState<FilePreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [newVersionPreview, setNewVersionPreview] = useState<NewVersionPreview | null>(null);

  // Вычисляем общее количество файлов
  const totalFiles = filePreview?.files?.length || 0;

  // Основная функция установки превью
  const setFilePreview = (preview: FilePreview | FilePreview[] | null) => {
    if (!preview) {
      clearFilePreview();
      return;
    }

    // Если preview - массив (множественная загрузка)
    if (Array.isArray(preview)) {
      const allFiles = preview.flatMap(p => p.files || (p.file ? [p.file] : []));
      
      if (allFiles.length > 0) {
        const firstPreview = preview[0];
        
        setFilePreviewState({
          files: allFiles,
          folderId: firstPreview.folderId,
          //folderName: firstPreview.folderName,
          size: allFiles.reduce((total, file) => total + file.size, 0),
          customName: allFiles.length === 1 
            ? (firstPreview.customName || allFiles[0].name.replace(/\.[^/.]+$/, ""))
            : `${allFiles.length} файлов`,
          studyId: firstPreview.studyId,
          siteId: firstPreview.siteId,
          country: firstPreview.country,
          createdBy: firstPreview.createdBy,
          ...(allFiles.length === 1 && { file: allFiles[0] })
        });
        
        setIsPreviewOpen(true);
        setUploadMode(allFiles.length === 1 ? 'single' : 'bulk');
      }
      return;
    }

    // Если preview - одиночный объект
    const files = preview.files || (preview.file ? [preview.file] : []);
    
    setFilePreviewState({
      ...preview,
      files: files.length > 0 ? files : (preview.file ? [preview.file] : []),
      size: preview.size || files.reduce((total, file) => total + file.size, 0)
    });
    
    setIsPreviewOpen(true);
    setUploadMode(files.length > 1 ? 'bulk' : 'single');
  };

  // Очистка превью
  const clearFilePreview = () => {
    setFilePreviewState(null);
    setIsPreviewOpen(false);
    setUploadMode(undefined);
    resetUploadState();
  };

  // Добавление файлов к существующему превью
  const addFilesToPreview = (newFiles: File[]) => {
    if (!filePreview) return;

    const currentFiles = filePreview.files || (filePreview.file ? [filePreview.file] : []);
    const allFiles = [...currentFiles, ...newFiles];

    setFilePreviewState({
      ...filePreview,
      files: allFiles,
      size: allFiles.reduce((total, file) => total + file.size, 0),
      customName: allFiles.length === 1 
        ? (filePreview.customName || allFiles[0].name.replace(/\.[^/.]+$/, ""))
        : `${allFiles.length} файлов`,
      ...(allFiles.length > 1 && { file: undefined }),
      ...(allFiles.length === 1 && { file: allFiles[0] })
    });
    
    setUploadMode(allFiles.length === 1 ? 'single' : 'bulk');
  };

  // Удаление файла из превью по индексу
  const removeFileFromPreview = (index: number) => {
    if (!filePreview) return;

    const currentFiles = filePreview.files || (filePreview.file ? [filePreview.file] : []);
    const newFiles = currentFiles.filter((_, i) => i !== index);

    if (newFiles.length === 0) {
      clearFilePreview();
      return;
    }

    setFilePreviewState({
      ...filePreview,
      files: newFiles,
      size: newFiles.reduce((total, file) => total + file.size, 0),
      customName: newFiles.length === 1 
        ? (newFiles[0].name.replace(/\.[^/.]+$/, ""))
        : `${newFiles.length} файлов`,
      ...(newFiles.length === 1 && { file: newFiles[0] }),
      ...(newFiles.length > 1 && { file: undefined })
    });
    
    setUploadMode(newFiles.length === 1 ? 'single' : 'bulk');
  };

  // Удаление нескольких выбранных файлов
  const removeSelectedFiles = (indices: number[]) => {
    if (!filePreview) return;

    const currentFiles = filePreview.files || (filePreview.file ? [filePreview.file] : []);
    const newFiles = currentFiles.filter((_, i) => !indices.includes(i));

    if (newFiles.length === 0) {
      clearFilePreview();
      return;
    }

    setFilePreviewState({
      ...filePreview,
      files: newFiles,
      size: newFiles.reduce((total, file) => total + file.size, 0),
      customName: newFiles.length === 1 
        ? (newFiles[0].name.replace(/\.[^/.]+$/, ""))
        : `${newFiles.length} файлов`,
      ...(newFiles.length === 1 && { file: newFiles[0] }),
      ...(newFiles.length > 1 && { file: undefined })
    });
    
    setUploadMode(newFiles.length === 1 ? 'single' : 'bulk');
  };

  // Обновление метаданных превью
  const updatePreviewMetadata = (updates: Partial<FilePreview>) => {
    if (!filePreview) return;
    
    setFilePreviewState({
      ...filePreview,
      ...updates,
      // Если обновляем customName, оставляем его как есть
      customName: updates.customName || filePreview.customName
    });
  };

  const setNewVersion = (preview: NewVersionPreview | null) => {
    setNewVersionPreview(preview)
  };
  

  const clearNewVersion = () => {
    setNewVersionPreview(null)
  };

  // Установка состояния загрузки
  const setUploading = (uploading: boolean) => {
    setIsUploading(uploading);
    if (!uploading) {
      setUploadProgress(0);
    }
  };

  // Сброс состояния загрузки
  const resetUploadState = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedCount(0);
  };

  const value: UploadContextType = {
    // Состояния
    filePreview,
    isPreviewOpen,
    uploadMode,
    isUploading,
    uploadProgress,
    uploadedCount,
    totalFiles,
    newVersionPreview,
    
    // Основные функции
    setFilePreview,
    clearFilePreview,
    
    // Функции для работы с несколькими файлами
    addFilesToPreview,
    removeFileFromPreview,
    removeSelectedFiles,
    
    // Функции для управления загрузкой
    setUploading,
    setUploadProgress,
    setUploadedCount,
    resetUploadState,
    
    // Функции для обновления метаданных
    updatePreviewMetadata,

    // Функции управления новыми версиями
    setNewVersion,
    clearNewVersion,
    
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

// Хук для использования контекста
export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};