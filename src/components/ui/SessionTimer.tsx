// components/SessionTimer.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    //let interval: NodeJS.Timeout;

    const fetchTimeLeft = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
          cache: 'no-store',
        });
        
        const data = await response.json();
        
        // ✅ Если сессия истекла - редиректим
        if (data.sessionExpired || response.status === 401) {
          console.log('[SessionTimer] Session expired, redirecting');
          router.push('/login?reason=expired');
          return;
        }
        
        if (data.session?.idleTimeLeft !== undefined) {
          setTimeLeft(data.session.idleTimeLeft);
        }
      } catch (error) {
        console.error('Failed to fetch session time:', error);
      }
    };

    fetchTimeLeft();
    const interval = setInterval(fetchTimeLeft, 30000);

    return () => clearInterval(interval);
  }, [router]);

  if (timeLeft === null || timeLeft > 25 * 60) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  let color = '#10b981';
  if (timeLeft < 60) color = '#ef4444';
  else if (timeLeft < 300) color = '#f59e0b';

  return (
    <div style={{ 
      fontSize: 12, 
      color,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      background: 'rgba(0,0,0,0.05)',
      padding: '2px 6px',
      borderRadius: 4,
    }}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}