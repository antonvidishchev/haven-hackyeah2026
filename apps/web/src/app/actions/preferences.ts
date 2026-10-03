'use server';

import { cookies } from 'next/headers';
import { isLocale } from '@haven/shared';

import { LOCALE_COOKIE, THEME_COOKIE } from '@/lib/preferences';
import { isTheme } from '@/lib/theme';

const oneYear = 60 * 60 * 24 * 365;

export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: oneYear, sameSite: 'lax' });
}

/** Form variant of `setLocale`, so the switch works before JavaScript loads. */
export async function switchLocale(formData: FormData): Promise<void> {
  await setLocale(String(formData.get('locale')));
}

export async function setTheme(theme: string): Promise<void> {
  if (!isTheme(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme, { path: '/', maxAge: oneYear, sameSite: 'lax' });
}
