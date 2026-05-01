// src/wrappers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// (Опционально) Добавьте Devtools для удобной отладки
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Используем useState, чтобы создать клиент один раз на сессию клиента
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 минута для обычных данных
            gcTime: 5 * 60 * 1000, // 5 минут в кэше (было cacheTime)
            retry: 1,
            refetchOnWindowFocus: false, // Отключаем авто-рефетч при фокусе
            refetchOnReconnect: true, // Но рефетчим при восстановлении сети            
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}