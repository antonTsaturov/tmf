//src/components/UserSettings.tsx
'use client'

import React, { useEffect, useState } from 'react';
import { Dialog, Tabs, Flex, Text, TextField, Button, Box, IconButton, Separator, DataList,
  Badge, Card, Avatar, Spinner, Checkbox,
} from '@radix-ui/themes';
import { EyeOpenIcon, EyeClosedIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useAuth } from '@/wrappers/AuthProvider';
import { FaUser } from "react-icons/fa";
import { useNotification } from '@/wrappers/NotificationContext';
import { logger } from '@/lib/utils/logger';
import { useI18n } from '@/hooks/useI18n';
import { LanguageSwitcher } from './LanguageSwitcher';

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
  const { t } = useI18n('settings');
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
      logger.warn('Password change: empty fields');
      addNotification('error', t('fillAllFields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      logger.warn('Password change: passwords do not match');
      addNotification('error', t('passwordsNotMatch'));
      return;
    }

    if (newPassword.length < 8) {
      logger.warn('Password change: password too short');
      addNotification('error', t('passwordTooShort'));
      return;
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      logger.warn('Password change: does not meet requirements');
      addNotification('error', t('passwordComplexityFailed'));
      return;
    }

    try {
      onLoadingChange(true);

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        addNotification('success', t('passwordUpdated'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (onSuccess) onSuccess();
      } else {
        addNotification('error', String(data.error) || t('passwordChangeError'));
      }
    } catch (error) {
      logger.error('Password change: network error', error);
      addNotification('error', t('networkError'));
    } finally {
      onLoadingChange(false);
    }
  };

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
        <Text size="4" weight="bold" mb="2">{t('changePassword')}</Text>

        <Box>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            {t('currentPassword')}
          </Text>
          <TextField.Root type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('currentPasswordPlaceholder')} required disabled={externalLoading}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false">
            <TextField.Slot>
              <IconButton size="1" variant="ghost" type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)} disabled={externalLoading}>
                {showCurrentPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Box>

        <Box>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            {t('newPassword')}
          </Text>
          <TextField.Root type={showNewPassword ? 'text' : 'password'}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('newPasswordPlaceholder')} required disabled={externalLoading}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false">
            <TextField.Slot>
              <IconButton size="1" variant="ghost" type="button"
                onClick={() => setShowNewPassword(!showNewPassword)} disabled={externalLoading}>
                {showNewPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Box>

        <Box>
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            {t('confirmPassword')}
          </Text>
          <TextField.Root type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')} required disabled={externalLoading}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false">
            <TextField.Slot>
              <IconButton size="1" variant="ghost" type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={externalLoading}>
                {showConfirmPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
              </IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Box>

        <Box style={{ backgroundColor: 'var(--gray-3)', padding: '12px', borderRadius: '6px', opacity: externalLoading ? 0.5 : 1 }}>
          <Text size="1" color="gray" weight="medium">{t('passwordRequirements')}</Text>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
            <li><Text size="1" color="gray">{t('reqMinLength')}</Text></li>
            <li><Text size="1" color="gray">{t('reqUppercase')}</Text></li>
            <li><Text size="1" color="gray">{t('reqNumber')}</Text></li>
          </ul>
        </Box>
      </Flex>
    </form>
  );
};

const UserProfile: React.FC = () => {
  const { t } = useI18n('settings');
  const { user } = useAuth()!;

  return (
    <Flex direction="column" gap="4">
      <Text size="4" weight="bold" mb="2">{t('profileTitle')}</Text>

      <Box maxWidth="240px">
        <Card variant="classic">
          <Flex gap="3" align="center">
            <Avatar fallback={<FaUser />} />
            <Box>
              <Text as="div" size="2" weight="bold">{user?.name}</Text>
              <Text as="div" size="2" color="gray">{user?.role?.join(', ')}</Text>
            </Box>
          </Flex>
        </Card>
      </Box>

      <Box>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label minWidth="120px">{t('userId')}</DataList.Label>
            <DataList.Value><Badge color="jade" variant="soft" radius="full">{user?.id}</Badge></DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="120px">{t('email')}</DataList.Label>
            <DataList.Value>{user?.email}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="120px">{t('assignedStudies')}</DataList.Label>
            <DataList.Value>{user?.assigned_study_id?.length || 0}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="120px">{t('assignedSites')}</DataList.Label>
            <DataList.Value>{user?.assigned_site_id?.length || 0}</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Box>
    </Flex>
  );
};

const UserEmailNotification: React.FC = () => {
  const { t } = useI18n('settings');
  const { user } = useAuth()!;
  const { addNotification } = useNotification();
  const [enabled, setEnabled] = useState(user?.email_notifications_enabled ?? true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEnabled(user?.email_notifications_enabled ?? true);
  }, [user]);

  const handleChange = async (checked: boolean) => {
    setEnabled(checked);
    setLoading(true);

    try {
      const response = await fetch('/api/user/email-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked }),
      });

      const data = await response.json();

      if (response.ok) {
        addNotification('success', t('emailNotificationsUpdated'));
      } else {
        setEnabled(!checked);
        addNotification('error', data.error || t('emailNotificationsError'));
      }
    } catch (error) {
      logger.error('Email notifications toggle error', error);
      setEnabled(!checked);
      addNotification('error', t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" gap="4">
      <Text size="4" weight="bold" mb="2">{t('emailNotifications')}</Text>

      <Box style={{ backgroundColor: 'var(--gray-3)', padding: '16px', borderRadius: '6px' }}>
        <Flex align="center" gap="2" mb="3">
          <Checkbox
            checked={enabled}
            onCheckedChange={handleChange}
            disabled={loading}
            id="email-notifications-checkbox"
          />
          <Text
            as="label"
            htmlFor="email-notifications-checkbox"
            size="2"
            weight="medium"
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {t('emailNotificationsEnabled')}
          </Text>
        </Flex>

        <Text size="1" color="gray" style={{ lineHeight: '1.6' }}>
          {t('emailNotificationsDescription')}
        </Text>
      </Box>
    </Flex>
  );
};

const UserSettings: React.FC<UserSettingsProps> = ({ open, onOpenChange }) => {
  const { t } = useI18n('settings');
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const handleTabChange = (value: string) => setActiveTab(value);

  const handlePasswordSuccess = () => {
    setTimeout(() => setActiveTab('profile'), 1500);
  };

  useEffect(() => {
    if (!open) {
      setActiveTab('profile');
      setLoading(false);
    }
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 500 }} aria-describedby={undefined}>
        <Flex justify="between" align="center" mb="3">
          <Dialog.Title style={{ margin: 0 }}>{t('title')}</Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost" size="2"><Cross2Icon /></IconButton>
          </Dialog.Close>
        </Flex>

        <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Trigger value="profile" disabled={loading}>{t('profile')}</Tabs.Trigger>
            <Tabs.Trigger value="password" disabled={loading}>{t('password')}</Tabs.Trigger>
            <Tabs.Trigger value="notifications" disabled={loading}>{t('notifications')}</Tabs.Trigger>
            <Tabs.Trigger value="language" disabled={loading}>{t('language')}</Tabs.Trigger>
          </Tabs.List>

          <Box pt="4" pb="4" style={{ minHeight: '350px' }}>
            <Tabs.Content value="profile"><UserProfile /></Tabs.Content>
            <Tabs.Content value="password">
              <UserPassword onSuccess={handlePasswordSuccess} externalLoading={loading} onLoadingChange={setLoading} />
            </Tabs.Content>
            <Tabs.Content value="notifications"><UserEmailNotification /></Tabs.Content>
            <Tabs.Content value="language">
              <Text size="4" weight="bold" mb="2">{t('languageTitle')}</Text>
              <Flex mt="5">
                <LanguageSwitcher variant="radio" />
              </Flex>
            </Tabs.Content>
          </Box>
        </Tabs.Root>

        <Separator size="4" mb="4" />

        <Flex gap="3" justify="end" align="center">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={loading}>
              {activeTab === 'password' ? t('cancel') : t('close')}
            </Button>
          </Dialog.Close>
          {activeTab === 'password' && (
            <Button type="submit" form="password-form" size="2" disabled={loading}>
              {loading ? (
                <Flex align="center" gap="2"><Spinner size="1" /><Text>{t('updating')}</Text></Flex>
              ) : t('updatePassword')}
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default UserSettings;