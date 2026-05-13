// components/IdleWarning.tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog, Button, Flex, Text } from '@radix-ui/themes'; // или ваш UI фреймворк

interface IdleWarningProps {
  isOpen: boolean;
  timeLeft: number;
  onExtend: () => void;
  onClose: () => void;
}

export function IdleWarning({ isOpen, timeLeft, onExtend, onClose }: IdleWarningProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Session Expiring Soon</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Your session will expire in <strong>{timeLeft}</strong> second{timeLeft !== 1 ? 's' : ''} due to inactivity.
          Do you want to stay logged in?
        </Dialog.Description>
        
        <Flex gap="3" mt="4" justify="end">
          <Button variant="soft" color="gray" onClick={onClose}>
            Logout
          </Button>
          <Button onClick={onExtend}>
            Stay Logged In
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}