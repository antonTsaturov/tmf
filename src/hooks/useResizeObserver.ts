// // hooks/useResizeObserver.ts
// import { useEffect, useState, RefObject } from 'react';

// interface Size {
//   width: number;
//   height: number;
// }


// export function useResizeObserver<T extends HTMLElement>(ref: React.RefObject<HTMLDivElement | null>): Size {
//   const [size, setSize] = useState<Size>({ width: 0, height: 0 });

//   useEffect(() => {
//     // Проверяем, что ref существует и имеет текущий элемент
//     if (!ref?.current) {
//       return;
//     }

//     const element = ref.current;

//     const resizeObserver = new ResizeObserver((entries) => {
//       // Используем requestAnimationFrame для оптимизации производительности
//       console.log('hello')
//       window.requestAnimationFrame(() => {
//         if (!Array.isArray(entries) || !entries.length) {
//           return;
//         }

//         const entry = entries[0];
//         const { width, height } = entry.contentRect;

//         setSize({ width, height });
//       });
//     });

//     resizeObserver.observe(element);

//     // Получаем начальные размеры
//     const { width, height } = element.getBoundingClientRect();
//     setSize({ width, height });

//     return () => {
//       resizeObserver.disconnect();
//     };
//   }, [ref]); // Зависимость от ref

//   return size;
// }

// hooks/useResizeObserver.ts
import { useEffect, useState, RefObject } from 'react';

interface Size {
  width: number;
  height: number;
}

export function useResizeObserver<T extends HTMLElement>(
  ref: React.RefObject<HTMLElement | null>
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    // Проверяем, что ref существует и имеет текущий элемент
    if (!ref?.current) {
      return;
    }

    const element = ref.current;
    
    // Функция для обновления размеров
    const updateSize = () => {
      if (element) {
        const { width, height } = element.getBoundingClientRect();
        setSize({ width, height });
      }
    };

    // Устанавливаем начальные размеры
    updateSize();

    // Создаем ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      
      // Используем requestAnimationFrame для оптимизации
      window.requestAnimationFrame(() => {
        const entry = entries[0];
        
        // Берем размеры из contentRect
        let width = entry.contentRect.width;
        let height = entry.contentRect.height;
        
        // Если contentRect дает 0, пробуем getBoundingClientRect
        if (width === 0 || height === 0) {
          const rect = element.getBoundingClientRect();
          width = rect.width;
          height = rect.height;
        }
        
        setSize({ width, height });
      });
    });

    // Наблюдаем за элементом
    resizeObserver.observe(element);

    // Также наблюдаем за окном на случай изменения размеров
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [ref]); // Зависимость от ref

  return size;
}