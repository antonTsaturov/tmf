// src/wrappers/AuthProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import type { StudyUser } from '@/types/user';
import { MainContext } from '@/wrappers/MainContext';
import { initFetchInterceptor } from '@/lib/auth/initFetchInterceptor';
import { PageLoading } from '@/components/ui/PageLoading';
import { PUBLIC_PATHS } from '@/proxy';

// Клиентское подмножество StudyUser — только поля, нужные UI
type User = Pick<StudyUser, 'id' | 'name' | 'email' | 'role' | 'assigned_site_id' | 'assigned_study_id' | 'email_notifications_enabled' | 'assigned_country_by_study'>;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  //login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const mainContext = useContext(MainContext);
  const resetMainContext = mainContext?.resetContext;

  const isPublicPath = PUBLIC_PATHS.some(path => pathname?.startsWith(path));
  /**
   * 2. Синхронизация выхода между вкладками
   */
  useEffect(() => {
    const syncLogout = (event: StorageEvent) => {
      if (event.key === 'auth-logout') {
        //window.location.href = '/login';
        router.push('/login');
      }
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, []);

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

  useEffect(() => {
    initFetchInterceptor();

    // На публичных страницах не проверяем авторизацию
    if (!isPublicPath) {
      checkAuth();
    } else {
      // На публичных страницах сразу заканчиваем загрузку
      setLoading(false);
    }    
  }, [initFetchInterceptor]);



  // const login = async (email: string, password: string): Promise<boolean> => {
  //   setLoading(true);
  //   try {
  //     // Сбрасываем старое состояние ПЕРЕД логином на всякий случай
  //     resetMainContext?.();

  //     const response = await fetch('/api/auth/login', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ email, password }),
  //       credentials: 'include'
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       setUser(data.user);
  //       router.refresh(); // Обновляем серверные компоненты
  //       return true;
  //     }
  //     return false;
  //   } catch {
  //     return false;
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);

    // Сбрасываем фильтры и sessionStorage
    resetMainContext?.();

    // Уведомляем другие вкладки
    localStorage.setItem('auth-logout', Date.now().toString());
    router.push('/login');
    //window.location.href = '/login';
  };

  const handleIdleTimeout = useCallback(() => {
    // Сессия истекла по бездействию — очищаем состояние и редиректим
    setUser(null);

// Сбрасываем фильтры при таймауте
    resetMainContext?.();

    localStorage.setItem('auth-logout', Date.now().toString());
    //window.location.href = '/login';
    router.push('/login');
  }, [resetMainContext]);

  // 3. Клиентский таймер бездействия (15 мин без активности → logout)
  useIdleTimeout({
    onIdleTimeout: handleIdleTimeout,
    enabled: !!user && !isPublicPath,
  });

  useTokenRefresh({
    onRefreshFailure: () => {
      // Don't redirect immediately, let the fetch interceptor handle it
      //console.log('[Auth] Token refresh failed, marking session as invalid');
      
      // Clear user state but don't redirect right away
      // The next API call will trigger 401 and proper redirect
      setUser(null);
      
      // Optional: set a flag that session is expired
      sessionStorage.setItem('session_expired', 'true');
    },
    enabled: !!user && !isPublicPath,
  });

  // Проверка session_expired при возвращении на вкладку
  useEffect(() => {
    const handleFocus = () => {
      const sessionExpired = sessionStorage.getItem('session_expired');
      if (sessionExpired === 'true') {
        sessionStorage.removeItem('session_expired');
        router.push('/login');
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [router]);  

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAuthenticated: !!user }}>
      {!loading ? children : (
        <PageLoading />
        // <Flex p="3" justify="center" align="center" gap="2" height="100vh">
        //   <Spinner size="3" style={{ color: 'gray' }} />
        //   <Text size="1" weight="medium">Загрузка...</Text>
        // </Flex>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};