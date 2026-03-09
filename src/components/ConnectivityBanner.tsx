// components/ConnectivityBanner.tsx
'use client';

import { Callout, Flex, Text } from '@radix-ui/themes';
import { MdWifiOff } from 'react-icons/md';
import { useConnectivity } from '@/hooks/useConnect'; 

export function ConnectivityBanner() {
  const { isOnline } = useConnectivity();

  if (isOnline) return null;

  return (
    <Callout.Root
      color="red"
      variant="surface"
      style={{
        position: 'fixed',
        top: '80%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        minWidth: '320px',
        maxWidth: '400px',
        borderRadius: '8px', // Более квадратная (было скруглено, теперь умеренно)
        boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.2)',
        border: '2px solid var(--red-7)', // Более заметная граница
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <Flex align="center" gap="5" p="4"> {/* Увеличил padding */}
        <Callout.Icon>
          <MdWifiOff size={24} /> {/* Увеличил иконку */}
        </Callout.Icon>
        <Flex direction="column" gap="1">
          <Text size="3" weight="bold">Нет соединения</Text>
          <Callout.Text size="2" color="gray">
            Проверьте подключение к интернету.
          </Callout.Text>
        </Flex>
      </Flex>
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </Callout.Root>
  );
}