import { getRequestConfig } from 'next-intl/server';

export type Locale = 'en' | 'ru';

export const defaultLocale: Locale = 'ru';

export const locales: Locale[] = ['en', 'ru'];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale || defaultLocale;

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default
  };
});
