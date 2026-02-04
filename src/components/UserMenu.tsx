import { DropdownMenu, Button } from "@radix-ui/themes"
import { useModal } from "@/hooks/useModal"

export default function UserMenu() {

    const { isOpen, openModal, closeModal, modalProps } = useModal();

    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button color="gray">
                        Options <DropdownMenu.TriggerIcon />
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item onClick={openModal}>
                        Admin
                    </DropdownMenu.Item>

                    <DropdownMenu.Item>Exit</DropdownMenu.Item>
                    <DropdownMenu.Separator />
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </>
    )
}