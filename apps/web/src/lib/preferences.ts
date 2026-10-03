import 'server-only';

import { cookies } from 'next/headers';
import { defaultLocale, isLocale, type Locale } from '@haven/shared';

import { isTheme, type Theme } from './theme';

export type { Theme };

export const LOCALE_COOKIE = 'haven-locale';
export const THEME_COOKIE = 'haven-theme';

export async function getLocalePreference(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getThemePreference(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : 'system';
}
