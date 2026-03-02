import { useModal } from "@/hooks/useModal"
import { UserRole } from "@/types/types";
import { useAuth } from "@/wrappers/AuthProvider";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { useState } from "react";
import { FaUser } from "react-icons/fa";
import UserSettings from "./UserSettings";

export default function UserDropdownMenu() {
  const { openModal } = useModal();
	const { user, logout } = useAuth()!;
  const [settingsOpen, setSettingsOpen] = useState(false);

  const userRole = String(user?.role);

  if (!userRole) {
    return null;
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button  color="gray" >
            <FaUser /> {user?.name}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {userRole === UserRole.ADMIN && (
            <><DropdownMenu.Item onClick={openModal}>
                Admin Dashboard
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
            </>)
          }
          <DropdownMenu.Item>Study Metrics</DropdownMenu.Item>
          
          <DropdownMenu.Item
            onClick={() => setSettingsOpen(true)}
          >
            User Settings
          </DropdownMenu.Item>

          {<>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onClick={() => logout()}>
              Exit
            </DropdownMenu.Item>
          </>}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Модальное окно настроек */}
      <UserSettings 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />

    </>
  )
}