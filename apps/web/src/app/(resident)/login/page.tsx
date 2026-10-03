import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { demoAccounts, isSafeReturnPath } from '@haven/shared';

import { LoginForm } from '@/components/auth/login-form';
import { getEnumLabels } from '@/i18n/labels';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('login'))('title') };
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const [t, labels, { next }] = await Promise.all([
    getTranslations('login'),
    getEnumLabels(),
    searchParams,
  ]);
  const returnTo = isSafeReturnPath(next) ? next : undefined;

  return (
    <div className="resident-page">
      <h1>{t('title')}</h1>
      <p className="text-muted-foreground">{t('lead')}</p>
      <LoginForm next={returnTo} />
      <p className="text-sm text-muted-foreground">{t('guest')}</p>

      <section className="resident-card" aria-labelledby="demo-accounts">
        <h2 id="demo-accounts">{t('demoTitle')}</h2>
        <p>{t('demoLead')}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {demoAccounts.map((account) => (
            <li key={account.username}>
              {/* Posts only the username to the sign-in form; the server supplies the fixture password. */}
              <button
                type="submit"
                form="login-form"
                name="demo"
                value={account.username}
                formNoValidate
                aria-label={t('demoSignIn', { name: account.name })}
                className="flex min-h-14 w-full flex-col items-start rounded-xl border bg-background px-4 py-2 text-left hover:bg-muted"
              >
                <span className="font-medium">{account.name}</span>
                <span className="text-sm text-muted-foreground">
                  {labels.role[account.role]}
                  {account.organizationId
                    ? ` · ${labels.organization[account.organizationId]}`
                    : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
