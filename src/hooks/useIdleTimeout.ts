'use client';

import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 минут
const CHECK_INTERVAL = 60 * 1000;    // Проверка каждые 60 сек

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
];

interface UseIdleTimeoutOptions {
  onIdleTimeout: () => void;
  enabled?: boolean;
}

/**
 * Отслеживает активность пользователя на клиенте.
 * Если пользователь не взаимодействовал с页面 > 15 минут — вызывает onIdleTimeout.
 *
 * Не зависит от токенов — это чисто клиентский таймер бездействия.
 */
export function useIdleTimeout(options: UseIdleTimeoutOptions) {
  const { onIdleTimeout, enabled = true } = options;
  const lastActivityRef = useRef(0);
  const timeoutHandledRef = useRef(false);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    timeoutHandledRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initialize with current time on mount
    lastActivityRef.current = Date.now();

    // Инициализация: слушаем события активности
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Периодическая проверка: если прошло > IDLE_TIMEOUT с последнего действия
    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;

      if (idleTime >= IDLE_TIMEOUT && !timeoutHandledRef.current) {
        timeoutHandledRef.current = true;
        onIdleTimeout();
      }
    }, CHECK_INTERVAL);

    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(checkInterval);
    };
  }, [enabled, handleActivity, onIdleTimeout]);
}
