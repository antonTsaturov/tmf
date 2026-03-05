// src/wrappers/NotificationContext.tsx
'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Callout } from '@radix-ui/themes';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  isExiting?: boolean;
}

const NotificationContext = createContext<any>(null);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    // 1. Запускаем анимацию схлопывания
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isExiting: true } : n));

    // 2. Удаляем из DOM после того, как высота стала 0 (400мс как в CSS)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 400);
  }, []);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => removeNotification(id), 5000);
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div style={{ 
        position: 'fixed', 
        bottom: '30px', 
        right: '30px', 
        zIndex: 10000, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-end' // Уведомления прижаты к правому краю
      }}>
        {notifications.map((n) => {
          // Определяем имя цвета на основе типа
          const colorName = n.type === 'success' ? 'green' : n.type === 'error' ? 'red' : 'blue';

          return (
            <div 
              key={n.id} 
              className={`notification-item ${n.isExiting ? 'exiting' : ''}`}
              style={{ width: 'fit-content' }}
              onClick={() => removeNotification(n.id)}
            >
              <Callout.Root 
                color={colorName as any}
                variant="surface"
                highContrast // Помогает сделать текст и иконки более четкими на сплошном фоне
                style={{ 
                  cursor: 'pointer', 
                  minWidth: '250px', 
                  maxWidth: '350px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  
                  // ДИНАМИЧЕСКИЙ НЕПРОЗРАЧНЫЙ ЦВЕТ:
                  // Используем переменную --[color]-surface, она непрозрачная в Radix
                  backgroundColor: `var(--${colorName}-3)`,
                  opacity: 1
                }}
              >
                <Callout.Text weight="light">
                  {n.message}
                </Callout.Text>
              </Callout.Root>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);