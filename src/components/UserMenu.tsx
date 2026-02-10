import { useModal } from "@/hooks/useModal"
import { Button, DropdownMenu } from "@radix-ui/themes";
import { useRouter } from 'next/navigation';


export default function UserDropdownMenu() {
	const router = useRouter();
    const { isOpen, openModal, closeModal, modalProps } = useModal();

	const logout = async () => {
		//setLoading(true);

		try {
		const response = await fetch('/api/auth/logout', {
			method: 'POST',
			headers: {
			'Content-Type': 'application/json',
			},
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Login failed');
		}

		// Перенаправление после успешного входа
		router.push('/login');
		router.refresh();

		} catch (err: any) {
		//setError(err.message || 'Invalid email or password');
		} finally {
		//setLoading(false);
		}
	}

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
        <DropdownMenu.Item onClick={logout}>
            Exit
        </DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

        </>
    )
}