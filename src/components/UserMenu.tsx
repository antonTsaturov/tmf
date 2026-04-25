import { UserRole } from "@/types/types";
import { useAuth } from "@/wrappers/AuthProvider";
import { Button, DropdownMenu, Link, Tooltip,  } from "@radix-ui/themes";
import { useContext, useState } from "react";
import { FaUser } from "react-icons/fa";
import UserSettings from "./UserSettings";
import { usePathname } from "next/navigation";
import { useI18n } from "@/hooks/useI18n";
import { MainContext } from "@/wrappers/MainContext";

export default function UserDropdownMenu() {
  const { t } = useI18n('userMenu');
  const { context, updateContext } = useContext(MainContext)!;
  const { currentStudy } = context;
  
	const { user, logout } = useAuth()!;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();

  const userRole = String(user?.role);

  if (!userRole) {
    return null;
  }

  return (
    <>
      <DropdownMenu.Root >
        <DropdownMenu.Trigger style={{outline: 'none'}}>
          <Button  color="gray" aria-label={t('userMenu')}>
            <FaUser /> {user?.name}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {userRole === UserRole.ADMIN && (
            <>
            <Link href={`${pathname !== '/admin' ? "/admin" : '#' }`}>
              <DropdownMenu.Item >
                {t('adminDashboard')}
              </DropdownMenu.Item>
            </Link>
            <DropdownMenu.Separator />
            </>
          )}

          {/* <DropdownMenu.Item>
            {t('studyMetrics')}
          </DropdownMenu.Item> */}
          <Tooltip 
            content={currentStudy ? t('aboutStudy_toolTip') : t('aboutStudy_toolTipEmpty')}
          >
            <DropdownMenu.Item 
              onClick={() => currentStudy && updateContext({isStudyInfoPanelOpen: true})} 
              disabled={!currentStudy}
            >
              {t('aboutStudy')}
            </DropdownMenu.Item>
          </Tooltip>

          <DropdownMenu.Separator  />

          <DropdownMenu.Item onClick={() => setSettingsOpen(true)}>
            {t('userSettings')}
          </DropdownMenu.Item>

          <DropdownMenu.Item onClick={() => logout()}>
            {t('exit')}
          </DropdownMenu.Item>

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