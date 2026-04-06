// hooks/usePendingReviewsCount.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/wrappers/AuthProvider';
import { ActionRoleMap } from '@/domain/document/document.policy';
import { DocumentAction } from '@/types/document';
import { UserRole } from '@/types/types';
import { logger } from '@/lib/utils/logger';

const canApprove = (userRole: UserRole): boolean => {
  return ActionRoleMap[DocumentAction.APPROVE].includes(userRole);
};  

export function usePendingReviewsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    const admin = String(user?.role) == UserRole.ADMIN;
    if (!user || admin || !canApprove(String(user.role) as UserRole)) {
      setCount(0);
      setLoading(false);
      return;
    }

    const fetchCount = async () => {
      try {
        const response = await fetch('/api/documents/reviews/pending?limit=1');
        if (!response.ok) throw new Error('Failed to fetch count');
        const data = await response.json();
        setCount(data.pagination.total);
      } catch (error) {
        logger.error('Error fetching pending reviews count', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
    // Можно добавить периодическое обновление или WebSocket
    const interval = setInterval(fetchCount, 120000); // Every 2 minutes

    return () => clearInterval(interval);
  }, [user]);

  return { count, loading };
}