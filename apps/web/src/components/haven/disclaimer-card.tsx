import { PhoneCall } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

/** The 112 notice: Haven is not an emergency service. */
export async function DisclaimerCard() {
  const t = await getTranslations('disclaimer');
  return (
    <aside
      aria-labelledby="disclaimer-title"
      className="flex gap-4 rounded-2xl border border-destructive/30 bg-card p-5"
    >
      <PhoneCall aria-hidden className="mt-0.5 size-6 shrink-0 text-destructive" />
      <div className="flex flex-col gap-1">
        <h2 id="disclaimer-title" className="text-base font-semibold">
          {t('title')}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('body')}</p>
      </div>
    </aside>
  );
}
