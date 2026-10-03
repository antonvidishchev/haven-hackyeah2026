import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <main className="resident-page">
      <h1>{t('notFound')}</h1>
      <Link href="/" className="resident-button self-start">
        {t('goHome')}
      </Link>
    </main>
  );
}
