// src/lib/auth/initFetchInterceptor.ts

export const initFetchInterceptor = () => {
  const originalFetch = window.fetch;
  const refreshPromise: Promise<boolean> | null = null;
  let isRefreshing = false;
  const pendingRequests: Array<{
    resolve: (value: Response) => void;
    reject: (reason?: any) => void;
    input: RequestInfo | URL;
    init?: RequestInit;
  }> = [];

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : (input as any).url || '';
    
    // Функция для выполнения запроса
    const makeRequest = () => originalFetch.call(this, input, init);
    
    let response = await makeRequest();
    
    if (response.status === 401 && 
        !url.includes('/api/auth/refresh') && 
        !window.location.pathname.startsWith('/login')) {
      
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          const refreshRes = await originalFetch('/api/auth/refresh', { 
            method: 'POST',
            credentials: 'include'
          });
          
          if (refreshRes.ok) {
            // Обрабатываем все ожидающие запросы
            pendingRequests.forEach(({ resolve, reject, input, init }) => {
              originalFetch.call(this, input, init).then(resolve).catch(reject);
            });
            pendingRequests.length = 0;
            
            // Повторяем текущий запрос
            response = await makeRequest();
          } else {
            // Очищаем состояние и редиректим
            pendingRequests.forEach(({ reject }) => reject(new Error('Session expired')));
            pendingRequests.length = 0;
            window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
            return new Response(null, { status: 401 });
          }
        } finally {
          isRefreshing = false;
        }
      } else {
        // Ждем завершения refresh
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            if (!isRefreshing) {
              clearInterval(interval);
              resolve(true);
            }
          }, 100);
        });
        response = await makeRequest();
      }
    }
    
    return response;
  };
};