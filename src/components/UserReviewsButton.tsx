import { MainContext } from "@/wrappers/MainContext";
import { Button, Flex, Badge } from "@radix-ui/themes";
import { useContext, useState } from "react";
import { FiClock, FiFile} from "react-icons/fi";
import { MyReviews } from "./MyReviews";
import { usePendingReviewsCount } from "@/hooks/usePendingReviewsCount";

const UserReviewsButton = () => {

  const { context } = useContext(MainContext)!;
  const { reviewPendingCount: pendingCount } = context!;
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const { count } = usePendingReviewsCount();

  return (
    <div>
      <Button
        variant="solid"
        mr="3"
        onClick={() => setReviewsModalOpen(true)}
        >
        <Flex align="center" gap="2">
          <FiFile />
          {count && count > 0 && (
            <Badge color="red" variant="solid" size="1">
              {count}
            </Badge>
          )}
        </Flex>
      </Button>

      <MyReviews
        open={reviewsModalOpen}
        onOpenChange={setReviewsModalOpen}
        onReviewComplete={() => {
          // Опционально: обновить счетчик уведомлений
          console.log('Review completed');
        }}
      />
    </div>
  );
}

export default UserReviewsButton;