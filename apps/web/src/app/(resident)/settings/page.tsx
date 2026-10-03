import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { LanguageSwitch } from '@/components/navigation/language-switch';
import { ThemeChoice } from '@/components/theme-choice';
import { getEnumLabels } from '@/i18n/labels';
import { getThemePreference } from '@/lib/preferences';
import { getPrincipal } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('settings'))('title') };
}

export default async function SettingsPage() {
  const [t, theme, principal, labels] = await Promise.all([
    getTranslations('settings'),
    getThemePreference(),
    getPrincipal(),
    getEnumLabels(),
  ]);
  const signedIn = principal !== null && principal.role !== 'guest';
  return (
    <div className="resident-page">
      <h1>{t('title')}</h1>

      <section className="resident-card" aria-labelledby="account">
        <h2 id="account">{t('accountTitle')}</h2>
        {signedIn ? (
          <>
            <p>
              {t('signedInAs', { name: principal.name })}
              <br />
              {t('roleLabel', { role: labels.role[principal.role] })}
            </p>
            <SignOutButton className="resident-button secondary" />
          </>
        ) : (
          <>
            <p>{t('guest')}</p>
            <Link href="/login" className="resident-button secondary">
              {t('signIn')}
            </Link>
          </>
        )}
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
