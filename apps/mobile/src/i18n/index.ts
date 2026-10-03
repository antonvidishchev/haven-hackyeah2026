import { defaultLocale, isLocale, type Locale } from '@haven/shared';
import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { readPreference, writePreference } from '@/lib/preferences';

import { en } from './en';
import { pl } from './pl';

const LOCALE_KEY = 'haven-locale';

export const resources = {
  en: { translation: en },
  pl: { translation: pl },
} as const;

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  interpolation: { escapeValue: false },
});

/** Applies the locale stored on this device, if any. */
export async function loadStoredLocale(): Promise<void> {
  const stored = await readPreference(LOCALE_KEY);
  if (isLocale(stored) && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
}

export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  await writePreference(LOCALE_KEY, locale);
}

/** Current locale plus a setter, re-rendering when the language changes. */
export function useLocale(): { locale: Locale; setLocale: (locale: Locale) => void } {
  const { i18n: instance } = useTranslation();
  const current = instance.resolvedLanguage ?? instance.language;
  return {
    locale: isLocale(current) ? current : defaultLocale,
    setLocale: (locale) => void setLocale(locale),
  };
}

export default i18n;
