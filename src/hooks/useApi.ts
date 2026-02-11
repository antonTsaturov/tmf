// // hooks/useApi.ts
// export function useApi() {
//   const api = async <T>(
//     endpoint: string,
//     options?: RequestInit
//   ): Promise<T> => {
//     // Используем прокси для всех API запросов
//     const proxyUrl = `/api/proxy?path=${encodeURIComponent(endpoint)}`;
    
//     const response = await fetch(proxyUrl, {
//       ...options,
//       credentials: 'include',
//       headers: {
//         'Content-Type': 'application/json',
//         ...options?.headers,
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`API Error: ${response.statusText}`);
//     }

//     return response.json();
//   };

//   const get = <T>(endpoint: string) => api<T>(endpoint, { method: 'GET' });
  
//   const post = <T>(endpoint: string, data: any) => 
//     api<T>(endpoint, { 
//       method: 'POST', 
//       body: JSON.stringify(data) 
//     });
  
//   const put = <T>(endpoint: string, data: any) => 
//     api<T>(endpoint, { 
//       method: 'PUT', 
//       body: JSON.stringify(data) 
//     });
  
//   const del = <T>(endpoint: string) => 
//     api<T>(endpoint, { method: 'DELETE' });

//   return { get, post, put, delete: del };
// }

// hooks/useApi.ts
export function useApi() {
  const api = async <T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> => {
    // Прямой запрос к API без прокси
    const response = await fetch(endpoint, {
      ...options,
      credentials: 'include', // Важно для передачи cookies
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      // Пытаемся получить детали ошибки из ответа
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  const get = <T>(endpoint: string, options?: RequestInit) => 
    api<T>(endpoint, { ...options, method: 'GET' });
  
  const post = <T>(endpoint: string, data?: any, options?: RequestInit) => 
    api<T>(endpoint, { 
      ...options,
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    });
  
  const put = <T>(endpoint: string, data?: any, options?: RequestInit) => 
    api<T>(endpoint, { 
      ...options,
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    });
  
  const patch = <T>(endpoint: string, data?: any, options?: RequestInit) => 
    api<T>(endpoint, { 
      ...options,
      method: 'PATCH', 
      body: data ? JSON.stringify(data) : undefined 
    });
  
  const del = <T>(endpoint: string, options?: RequestInit) => 
    api<T>(endpoint, { ...options, method: 'DELETE' });

  return { 
    get, 
    post, 
    put, 
    patch, 
    delete: del 
  };
}