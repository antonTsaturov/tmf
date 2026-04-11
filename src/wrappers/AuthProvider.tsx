// src/wrappers/AuthProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AUTH_DISABLED } from '@/proxy';
import { Spinner, Flex, Text } from '@radix-ui/themes';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';


interface User {
  id: number;
  name: string;
  email: string;
  role: string[];
  assigned_site_id: number[];
  assigned_study_id: number[];
}

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
  const pathname = usePathname();

  // Проверить авторизацию при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include',
        cache: 'no-store' // Запрет кэширования
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

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        // ВАЖНО: Вызываем проверку авторизации еще раз, 
        // чтобы обновить все состояния и убедиться, что сессия активна        
        await checkAuth();
        router.refresh();
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });

    setUser(null);
    //router.push('/login');
    window.location.href = '/login'; // Жесткая перезагрузка страницы
  };

  // Handle token refresh failure — force logout
  const handleRefreshFailure = useCallback(() => {
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Automatic token refresh every 10 minutes
  useTokenRefresh({
    onRefreshFailure: handleRefreshFailure,
    enabled: !!user, // Only refresh when user is authenticated
  });

  // Автоматический редирект на логин, если пользователь не авторизован
  useEffect(() => {
    if (!AUTH_DISABLED) {
      const publicPaths = ['/login', '/reset-password'];
      if (!loading && !user && !publicPaths.includes(pathname)) {
        router.push(`/login?from=${encodeURIComponent(pathname)}`);
      }
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {/* Ключевое изменение: если мы еще грузимся (loading === true), 
        мы не рендерим children. Это предотвращает ситуацию, когда 
        компоненты внутри (как Navigation) видят user === null во время загрузки.
      */}
      {!loading ? children : (
        <>
          <Flex p="3" justify="center" align="center" gap="2" height="100vh">
            <Spinner size="3" style={{ color: 'gray' }} />
            <Text size="1" weight="medium">Loaging...</Text>
          </Flex>
        </>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};