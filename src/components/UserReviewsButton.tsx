// UserReviewsButton.tsx
import { Button, Flex, Badge, Link } from "@radix-ui/themes";
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
        <Button
          variant="solid"
          mr="3"
          >
          <Flex align="center" gap="2">
            <MdOutlinePendingActions />
            {count && count > 0 && (
              <Badge color="red" variant="solid" size="1">
                {count}
              </Badge>
            )}
          </Flex>
        </Button>
      </Link>

      {/* <MyReviews
        open={reviewsModalOpen}
        onOpenChange={setReviewsModalOpen}
        onReviewComplete={() => {
          console.log('Review completed');
        }}
      /> */}
    </div>
  );
}

export default UserReviewsButton;