// hooks/useResizeObserver.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement>() {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  // Используем callback ref вместо useRef
  const ref = useCallback((node: T | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    if (node !== null) {
      const observer = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return;
        
        window.requestAnimationFrame(() => {
          const entry = entries[0];
          let { width, height } = entry.contentRect;

          // Если размеры по нулям, пробуем через getBoundingClientRect
          if (width === 0 || height === 0) {
            const rect = node.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
          }

          setSize({ width, height });
        });
      });

      observer.observe(node);
      resizeObserverRef.current = observer;
      
      // Сразу замеряем начальный размер
      const initialRect = node.getBoundingClientRect();
      setSize({ width: initialRect.width, height: initialRect.height });
    }
  }, []);

  return [ref, size] as const;
}