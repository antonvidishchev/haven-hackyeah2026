import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { systemThemeScript, ThemeSync } from '@/components/theme-sync';
import { getThemePreference } from '@/lib/preferences';
import { cn } from '@/lib/utils';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    title: { default: 'Haven', template: '%s · Haven' },
    description: t('description'),
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f1' },
    { media: '(prefers-color-scheme: dark)', color: '#131e1a' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [locale, theme] = await Promise.all([getLocale(), getThemePreference()]);
  return (
    <html
      lang={locale}
      // The "system" theme script may add `.dark` before React hydrates.
      suppressHydrationWarning
      className={cn(geistSans.variable, geistMono.variable, 'h-full antialiased', {
        dark: theme === 'dark',
      })}
    >
      <head>
        {theme === 'system' ? (
          <script dangerouslySetInnerHTML={{ __html: systemThemeScript }} />
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <ThemeSync theme={theme} />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
