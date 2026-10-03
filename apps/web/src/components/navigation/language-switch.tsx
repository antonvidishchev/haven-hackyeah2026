import { locales } from '@haven/shared';
import { getLocale, getTranslations } from 'next-intl/server';

import { switchLocale } from '@/app/actions/preferences';
import { cn } from '@/lib/utils';

export async function LanguageSwitch({ className }: { className?: string }) {
  const [current, t] = await Promise.all([getLocale(), getTranslations('language')]);
  return (
    <form action={switchLocale} className={cn('flex', className)}>
      <fieldset className="flex rounded-lg border bg-background p-0.5">
        <legend className="sr-only">{t('label')}</legend>
        {locales.map((locale) => (
          <button
            key={locale}
            type="submit"
            name="locale"
            value={locale}
            lang={locale}
            aria-pressed={locale === current}
            aria-label={t(locale)}
            className="min-h-9 min-w-10 rounded-md px-2 text-sm font-medium text-muted-foreground uppercase aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
          >
            {locale}
          </button>
        ))}
      </fieldset>
    </form>
  );
}
