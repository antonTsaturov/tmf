'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from '@/wrappers/LocaleProvider';

/**
 * Convenience hook that returns both translations and locale controls.
 *
 * Usage:
 *   const { t, locale, setLocale } = useI18n('common');
 *   t('loading')       // "Загрузка..." or "Loading..."
 *   t('save')          // "Сохранить" or "Save"
 */
export function useI18n(namespace: string) {
  const t = useTranslations(namespace);
  const { locale, setLocale } = useLocale();

  return { t, locale, setLocale };
}
