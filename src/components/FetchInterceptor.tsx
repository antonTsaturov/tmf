'use client';

import { useEffect } from 'react';
import { canRedirectToLogin, redirectToLogin } from '@/lib/api/authRedirect';

let installed = false;

function initFetchInterceptor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const response = await originalFetch.call(this, input, init);

    // 401 от API — сессия истекла, редирект на логин
    if (response.status === 401) {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.pathname
          : (input as Request).url || '';

      // Не редиректим сам refresh-запрос (иначе бесконечный цикл)
      if (!url.includes('/api/auth/refresh')) {
        if (canRedirectToLogin()) {
          redirectToLogin();
        }
      }
    }

    return response;
  };
}

/**
 * Клиентский компонент, который инициализирует глобальный fetch-перехватчик.
 * При 401 от API — перенаправляет на страницу логина.
 */
export function FetchInterceptor() {
  useEffect(() => {
    initFetchInterceptor();
  }, []);

  return null;
}
