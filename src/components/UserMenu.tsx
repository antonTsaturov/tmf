import { useModal } from "@/hooks/useModal"
import { Button, DropdownMenu } from "@radix-ui/themes";


export default function UserDropdownMenu() {

    const { isOpen, openModal, closeModal, modalProps } = useModal();

    return (
        <>
<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		<Button  color="gray" >
			Options
		</Button>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content>
        <DropdownMenu.Item onClick={openModal}>
            Admin
        </DropdownMenu.Item>

		<DropdownMenu.Item >Duplicate</DropdownMenu.Item>
		<DropdownMenu.Separator />
		<DropdownMenu.Item>Archive</DropdownMenu.Item>


		<DropdownMenu.Separator />
	</DropdownMenu.Content>
</DropdownMenu.Root>

        </>
    )
}