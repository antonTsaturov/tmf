// hooks/useDragAndDrop.ts
import { useState, useCallback, DragEvent, useRef } from 'react';
import { logger } from '@/lib/utils/logger';

interface UseDragAndDropOptions {
  onDropFiles: (files: File[]) => void;
  disabled?: boolean;
  accept?: string[]; // Например: ['application/pdf', 'image/*']
}

interface UseDragAndDropReturn {
  isDragOver: boolean;
  handleDragEnter: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
}

export const useDragAndDrop = ({
  onDropFiles,
  disabled = false,
  accept = []
}: UseDragAndDropOptions): UseDragAndDropReturn => {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;

    // Проверяем, что перетаскиваются файлы
    if (Array.from(e.dataTransfer.types).includes('Files')) {
    //if (e.dataTransfer.types.includes('Files')) {
      dragCounter.current++;
      // Если заданы ограничения по типам, можно проверить и их здесь
      if (dragCounter.current === 1) {
        setIsDragOver(true);
      }

    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;

    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    // Необходимо для разрешения drop
    e.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter.current = 0;
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;

    // Фильтрация по типам файлов, если указано
    const filteredFiles = accept.length > 0 
      ? files.filter(file => accept.some(type => file.type.startsWith(type.replace('*', ''))))
      : files;

    if (filteredFiles.length > 0) {
      onDropFiles(filteredFiles);
    }
  }, [disabled, accept, onDropFiles]);

  return {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  };
};