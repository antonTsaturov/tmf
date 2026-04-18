// src/components/StudyReportsButton.tsx

import { Button, Link, Tooltip } from "@radix-ui/themes";
import { HiOutlineDocumentReport } from "react-icons/hi";

const StudyReportsButton = () => {

  return (
    <div>
      <Link href="/reports">
        <Tooltip content="Create report">
          <Button variant="solid" mr="3" style={{ cursor: "pointer" }} >
            <HiOutlineDocumentReport />
          </Button>
        </Tooltip>
      </Link>
    </div>
  );
};

export default StudyReportsButton;
