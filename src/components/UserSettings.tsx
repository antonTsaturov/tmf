//src/components/UserSettings.tsx
 
'use client'

import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  Tabs, 
  Flex, 
  Text, 
  TextField, 
  Button, 
  Box,
  IconButton,
  Separator
} from '@radix-ui/themes';
import { EyeOpenIcon, EyeClosedIcon, Cross2Icon } from '@radix-ui/react-icons';

interface UserSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserPassword: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Логика смены пароля
    console.log('Password change requested', { currentPassword, newPassword, confirmPassword });
  };
  
  useEffect(() => {
    // Сбрасываем значение поля после монтирования компонента
    const timer = setTimeout(() => {
      setCurrentPassword('');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);  

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <Text size="4" weight="bold" mb="2">Change Password</Text>
        
        {/* Current Password */}
        <Box>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Current Password
          </Text>
          <TextField.Root
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            >
            <TextField.Slot>
              <IconButton
                size="1"
                variant="ghost"
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Box>

        {/* New Password */}
        <Box>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            New Password
          </Text>
          <TextField.Root
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            >
            <TextField.Slot>
              <IconButton
                size="1"
                variant="ghost"
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Box>

        {/* Confirm New Password */}
        <Box>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Confirm New Password
          </Text>
          <TextField.Root
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            >
            <TextField.Slot>
              <IconButton
                size="1"
                variant="ghost"
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Box>

        {/* Password requirements hint */}
        <Box style={{ backgroundColor: 'var(--gray-3)', padding: '12px', borderRadius: '6px' }}>
          <Text size="1" color="gray" weight="medium">Password requirements:</Text>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            <li><Text size="1" color="gray">At least 8 characters long</Text></li>
            <li><Text size="1" color="gray">Contains at least one uppercase letter</Text></li>
            <li><Text size="1" color="gray">Contains at least one number</Text></li>
            <li><Text size="1" color="gray">Contains at least one special character</Text></li>
          </ul>
        </Box>
      </Flex>
    </form>
  );
};

const UserProfile: React.FC = () => {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');

  return (
    <Flex direction="column" gap="4">
      <Text size="4" weight="bold" mb="2">Profile Information</Text>
      
      {/* Name field */}
      <Box>
        <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
          Full Name
        </Text>
        <TextField.Root
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            disabled
          >
        </TextField.Root>
      </Box>

      {/* Email field */}
      <Box>
        <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
          Email Address
        </Text>
        <TextField.Root
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled
          >
        </TextField.Root>
      </Box>
    </Flex>
  );
};

const UserSettings: React.FC<UserSettingsProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 500 }}>
        <Flex justify="between" align="center" mb="3">
          <Dialog.Title style={{ margin: 0 }}>User Settings</Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost" size="2">
              <Cross2Icon />
            </IconButton>
          </Dialog.Close>
        </Flex>
                
        <Tabs.Root defaultValue="profile">
          <Tabs.List>
            <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
            <Tabs.Trigger value="password">Password</Tabs.Trigger>
          </Tabs.List>

          <Box pt="4" pb="4" style={{ minHeight: '350px' }}>
            <Tabs.Content value="profile">
              <UserProfile />
            </Tabs.Content>

            <Tabs.Content value="password">
              <UserPassword />
            </Tabs.Content>
          </Box>
        </Tabs.Root>

        <Separator size="4" mb="4" />

        <Flex gap="3" justify="end" align="center">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button type="submit" size="2">
            Update Password
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default UserSettings;