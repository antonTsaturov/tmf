//src/components/UserSettings.tsx
'use client'
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { 
  Dialog, 
  Tabs, 
  Flex, 
  Text, 
  TextField, 
  Button, 
  Box,
  IconButton,
  Separator,
  DataList,
  Badge,
  Card,
  Avatar,
  Spinner
} from '@radix-ui/themes';
import { EyeOpenIcon, EyeClosedIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useAuth } from '@/wrappers/AuthProvider';
import { FaUser } from "react-icons/fa";
import { useNotification } from '@/wrappers/NotificationContext';

interface UserSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserPasswordProps {
  onSuccess?: () => void;
  externalLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

const UserPassword = ({ onSuccess, externalLoading, onLoadingChange }: UserPasswordProps) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { addNotification } = useNotification();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword || !currentPassword) {
      console.log('Все поля должны быть заполнены')
      addNotification('error', 'Все поля должны быть заполнены');
      return;
    }

    if (newPassword !== confirmPassword) {
      console.log('Новые пароли не совпадают')
      addNotification('error', 'Новые пароли не совпадают');
      return;
    }

    if (newPassword.length < 8) {
      console.log('Пароль должен быть не менее 8 символов')
      addNotification('error', 'Пароль должен быть не менее 8 символов');
      return;
    }

    // Проверка на сложность пароля
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    //const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers ) { // || !hasSpecialChar
      console.log('Not match pass requirements')
      addNotification('error', 'Not match pass requirements');
      return;
    }

    try {
      onLoadingChange(true); // Включаем загрузку через родителя
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addNotification('success', 'Пароль успешно изменен');
        
        // Очищаем форму
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Вызываем onSuccess если передан
        if (onSuccess) {
          onSuccess();
        }
      } else {
        addNotification('error', String(data.error) || 'Ошибка при смене пароля');
      }
    } catch (error) {
      addNotification('error', 'Сетевая ошибка');
    } finally {
      onLoadingChange(false); // Выключаем загрузку через родителя
    }
  };  
  
  // Сбрасываем значение поля при открытии формы
  useEffect(() => {
    if (!externalLoading) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [externalLoading]);

  return (
    <form onSubmit={handleSubmit} id="password-form">
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
              disabled={externalLoading}
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
                disabled={externalLoading}
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
              disabled={externalLoading}
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
                disabled={externalLoading}
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
              disabled={externalLoading}
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
                disabled={externalLoading}
              >
                {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Box>

        {/* Password requirements hint */}
        <Box style={{ 
          backgroundColor: 'var(--gray-3)', 
          padding: '12px', 
          borderRadius: '6px',
          opacity: externalLoading ? 0.5 : 1
        }}>
          <Text size="1" color="gray" weight="medium">Password requirements:</Text>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            <li><Text size="1" color="gray">At least 8 latin characters long</Text></li>
            <li><Text size="1" color="gray">Contains at least one uppercase letter</Text></li>
            <li><Text size="1" color="gray">Contains at least one number</Text></li>
            {/* <li><Text size="1" color="gray">Contains at least one special character</Text></li> */}
          </ul>
        </Box>
      </Flex>
    </form>
  );
};

const UserProfile: React.FC = () => {
  const { user } = useAuth()!;

  return (
    <Flex direction="column" gap="4">
      <Text size="4" weight="bold" mb="2">Profile Information</Text>
      
      {/* Card */}
      <Box maxWidth="240px">
        <Card variant="classic">
          <Flex gap="3" align="center">
            <Avatar fallback={<FaUser />} />
            <Box>
              <Text as="div" size="2" weight="bold">
                {user?.name}
              </Text>
              <Text as="div" size="2" color="gray">
                {user?.role?.join(', ')}
              </Text>
            </Box>
          </Flex>
        </Card>
      </Box>

      {/* Data List */}
      <Box>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label minWidth="120px">User ID</DataList.Label>
            <DataList.Value>
              <Badge color="jade" variant="soft" radius="full">
                {user?.id}
              </Badge>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label minWidth="120px">Email</DataList.Label>
            <DataList.Value>
              {user?.email}
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label minWidth="120px">Assigned Studies</DataList.Label>
            <DataList.Value>
              {user?.assigned_study_id?.length || 0}
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label minWidth="120px">Assigned Sites</DataList.Label>
            <DataList.Value>
              {user?.assigned_site_id?.length || 0}
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Box>
    </Flex>
  );
};

const UserSettings: React.FC<UserSettingsProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handlePasswordSuccess = () => {
    // Переключаемся на профиль после успешной смены пароля
    setTimeout(() => {
      setActiveTab('profile');
    }, 1500);
  };

  // Сбрасываем состояние при закрытии
  useEffect(() => {
    if (!open) {
      setActiveTab('profile');
      setLoading(false);
    }
  }, [open]);

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
                
        <Tabs.Root
          value={activeTab}
          onValueChange={handleTabChange}        
        >
          <Tabs.List>
            <Tabs.Trigger value="profile" disabled={loading}>Profile</Tabs.Trigger>
            <Tabs.Trigger value="password" disabled={loading}>Password</Tabs.Trigger>
          </Tabs.List>

          <Box pt="4" pb="4" style={{ minHeight: '350px' }}>
            <Tabs.Content value="profile">
              <UserProfile />
            </Tabs.Content>

            <Tabs.Content value="password">
              <UserPassword
                onSuccess={handlePasswordSuccess}
                externalLoading={loading}
                onLoadingChange={setLoading}
              />
            </Tabs.Content>
          </Box>
        </Tabs.Root>

        <Separator size="4" mb="4" />

        <Flex gap="3" justify="end" align="center">
          <Dialog.Close>
            <Button 
              variant="soft" 
              color="gray"
              disabled={loading}
            >
              {activeTab === 'password' ? 'Cancel' : 'Close'}
            </Button>
          </Dialog.Close>
          
          {activeTab === 'password' && (
            <Button 
              type="submit"
              form="password-form"
              size="2"
              disabled={loading}
            >
              {loading ? (
                <Flex align="center" gap="2">
                  <Spinner size="1" />
                  <Text>Updating...</Text>
                </Flex>
              ) : (
                'Update Password'
              )}
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default UserSettings;