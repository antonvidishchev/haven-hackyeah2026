import { en, type EnumLabels } from './en.js';
import { pl } from './pl.js';

export const locales = ['en', 'pl'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (locales as readonly string[]).includes(value);

export const enumLabels: Record<Locale, EnumLabels> = { en, pl };

export type { EnumLabels };
