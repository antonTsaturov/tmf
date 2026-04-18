import { MainContext } from "@/wrappers/MainContext";
import { Button, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useContext } from "react";



const HomeButton = () => {
  const { context, updateContext } = useContext(MainContext)!;
  const { isRightFrameOpen } = context;

  const handleRightFrameClose = () => {
    updateContext({ isRightFrameOpen: false });
  };


  return (
    <Link href="/home">
      <Button
        variant="solid"
        mr="3"
        onClick={() => {
          // Закрыть боковой фрейм, чтобы он так же был закрыт при переходе на /home
          if (isRightFrameOpen) {
            handleRightFrameClose();
          }
        }}
      >
        <Text align="center">eTMF</Text>
      </Button>
    </Link>
  );
}

export default  HomeButton;