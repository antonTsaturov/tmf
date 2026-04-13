// src/wrappers/AuthProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, Flex, Text } from '@radix-ui/themes';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import type { StudyUser } from '@/types/user';

// Клиентское подмножество StudyUser — только поля, нужные UI
type User = Pick<StudyUser, 'id' | 'name' | 'email' | 'role' | 'assigned_site_id' | 'assigned_study_id'>;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  //const pathname = usePathname();

  /**
   * 1. Перехватчик 401 (Session Expired)
   * Вместо сложного кулдауна проверяем только, не находимся ли мы уже на логине.
   */
  const initFetchInterceptor = useCallback(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const response = await originalFetch.call(this, input, init);

      if (response.status === 401) {
        const url = typeof input === 'string' ? input : (input as any).url || '';
        
        // Не редиректим, если это сам запрос обновления или мы уже на странице логина
        if (!url.includes('/api/auth/refresh') && !window.location.pathname.startsWith('/login')) {
          // Используем window.location для полной очистки состояния приложения
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
        }
      }
      return response;
    };
  }, []);

  /**
   * 2. Синхронизация выхода между вкладками
   */
  useEffect(() => {
    const syncLogout = (event: StorageEvent) => {
      if (event.key === 'auth-logout') {
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, []);

  useEffect(() => {
    initFetchInterceptor();
    checkAuth();
  }, [initFetchInterceptor]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        router.refresh(); // Обновляем серверные компоненты
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    // Уведомляем другие вкладки
    localStorage.setItem('auth-logout', Date.now().toString());
    router.push('/login');
    //window.location.href = '/login';
  };

  const handleIdleTimeout = useCallback(() => {
    // Сессия истекла по бездействию — очищаем состояние и редиректим
    setUser(null);
    localStorage.setItem('auth-logout', Date.now().toString());
    window.location.href = '/login';
  }, []);

  // 3. Клиентский таймер бездействия (15 мин без активности → logout)
  useIdleTimeout({
    onIdleTimeout: handleIdleTimeout,
    enabled: !!user,
  });

  useTokenRefresh({
    onRefreshFailure: () => {
      setUser(null);
      window.location.href = '/login';
    },
    enabled: !!user,
  });

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {!loading ? children : (
        <Flex p="3" justify="center" align="center" gap="2" height="100vh">
          <Spinner size="3" style={{ color: 'gray' }} />
          <Text size="1" weight="medium">Загрузка...</Text>
        </Flex>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};