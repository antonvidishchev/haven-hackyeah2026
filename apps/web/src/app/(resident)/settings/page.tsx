import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LanguageSwitch } from '@/components/navigation/language-switch';
import { ThemeChoice } from '@/components/theme-choice';
import { getThemePreference } from '@/lib/preferences';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('settings'))('title') };
}

export default async function SettingsPage() {
  const [t, theme] = await Promise.all([getTranslations('settings'), getThemePreference()]);
  return (
    <div className="resident-page">
      <h1>{t('title')}</h1>

      <section className="resident-card" aria-labelledby="account">
        <h2 id="account">{t('accountTitle')}</h2>
        <p>{t('guest')}</p>
        <Link href="/login" className="resident-button secondary">
          {t('signIn')}
        </Link>
      </section>

      <section className="resident-card" aria-labelledby="appearance">
        <h2 id="appearance">{t('appearance')}</h2>
        <ThemeChoice
          value={theme}
          legend={t('appearance')}
          labels={{ system: t('themeSystem'), light: t('themeLight'), dark: t('themeDark') }}
        />
      </section>

      <section className="resident-card" aria-labelledby="language">
        <h2 id="language">{t('languageTitle')}</h2>
        <LanguageSwitch />
      </section>
    </div>
  );
}
