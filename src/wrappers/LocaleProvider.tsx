'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { Locale, defaultLocale } from '@/i18n.config';
import messagesEn from '@/messages/en.json';
import messagesRu from '@/messages/ru.json';

const STORAGE_KEY = 'etmf-locale';

const messagesMap: Record<Locale, typeof messagesEn> = {
  en: messagesEn,
  ru: messagesRu
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale = defaultLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  // Загружаем сохранённую локаль при маунте
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && ['en', 'ru'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messagesMap[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
