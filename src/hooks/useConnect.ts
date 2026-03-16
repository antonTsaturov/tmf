// hooks/useConnect.ts
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';

export const useConnectivity = (checkInterval = 30000) => {
  const [isOnline, setIsOnline] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsOnline(true); // Не показываем баннер для неавторизованных
      return;
    }

    const checkConnection = async () => {
      try {
        const response = await fetch('/api/ping', {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
        });
        // 200-299 = OK, 401 = токен невалиден (но сеть есть)
        setIsOnline(response.ok || response.status === 401);
      } catch {
        setIsOnline(false);
      }
    };

    // Системные события
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Первая проверка + интервал
    checkConnection();
    const intervalId = setInterval(checkConnection, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [user, checkInterval]);

  //console.log('🔍 Ping check:', { user: !!user, isOnline });

  return { isOnline };
};