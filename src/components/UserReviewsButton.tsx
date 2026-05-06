// UserReviewsButton.tsx
import { Button, Flex, Badge, Link, Tooltip, Text } from "@radix-ui/themes";
import { useMemo } from "react";
import { usePendingReviewsCount } from "@/hooks/usePendingReviewsCount";
import { UserRole } from "@/types/types";
import { useAuth } from "@/wrappers/AuthProvider";
import { MdOutlinePendingActions } from "react-icons/md";

const UserReviewsButton = () => {
  const { count } = usePendingReviewsCount();
  const { user } = useAuth();

  // Проверяем, имеет ли пользователь право видеть кнопку
  const canViewReviews = useMemo(() => {
    const userRole = String(user?.role);
    // Только ADMIN и STUDY_MANAGER
    return userRole === UserRole.ADMIN || userRole === UserRole.STUDY_MANAGER;
  }, [user?.role]);

  // Если нет прав, не рендерим кнопку
  if (!canViewReviews) return null;

  return (
    <div>
      <Link href="/reviews">
        <Tooltip content="Pending review">
          <Button 
            variant="surface" 
            mr="2" 
            style={{ 
              cursor: 'pointer',
              position: 'relative'  // Добавляем относительное позиционирование для кнопки
            }} 
          >
            <Flex align="center" gap="2">
              <MdOutlinePendingActions />
            </Flex>
            
            {/* Бейдж теперь вне Flex и позиционируется абсолютно */}
            {count && count > 0 && (
              <Badge 
                color="red" 
                variant="solid" 
                size="1"
                style={{ 
                  position: 'absolute',
                  top: '-8px',      // Смещаем вверх
                  right: '-8px',    // Смещаем вправо
                  borderRadius: '50%',
                  minWidth: '18px',   // Минимальная ширина
                  width: 'auto',      // Автоширина для чисел больше 9
                  height: '18px',
                  padding: '0 5px',   // Отступы для чисел
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: '10px', lineHeight: 1 }}>
                  {count > 99 ? '99+' : count}
                </Text>
              </Badge>
            )}
          </Button>
        </Tooltip>
      </Link>
    </div>
  );
}

export default UserReviewsButton;