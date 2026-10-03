import { HeartHandshake, Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale, MatchReason, SupportMatchesResponse } from '@haven/shared';

import { DisclaimerCard } from '@/components/haven/disclaimer-card';
import { StatusBadge } from '@/components/haven/status-badge';
import { getEnumLabels } from '@/i18n/labels';

const languageNames = (locale: string) => new Intl.DisplayNames([locale], { type: 'language' });

/** "Verbal harassment · I Stare Miasto · “tram”": why a resource was suggested. */
async function getReasonText() {
  const [t, labels] = await Promise.all([getTranslations('support'), getEnumLabels()]);
  return (reasons: MatchReason[]) =>
    reasons
      .map((reason) => {
        switch (reason.type) {
          case 'category':
            return labels.category[reason.value];
          case 'district':
            return labels.district[reason.value];
          case 'citywide':
            return t('citywide');
          case 'keyword':
            return t('keyword', { keyword: reason.value });
          case 'severity':
            return labels.severity[reason.value];
        }
      })
      .join(' · ');
}

/** Fictional city resources matched to a filed report, for the resident. */
export async function SupportMatches({ matches }: { matches: SupportMatchesResponse }) {
  const [t, labels, locale, reasonText] = await Promise.all([
    getTranslations('support'),
    getEnumLabels(),
    getLocale(),
    getReasonText(),
  ]);
  const lang = locale as Locale;
  const languages = languageNames(locale);
  return (
    <section aria-labelledby="support-title" className="resident-card">
      <h2 id="support-title" className="flex items-center gap-2 text-lg font-semibold">
        <HeartHandshake aria-hidden className="size-5 text-primary" />
        {t('title')}
      </h2>
      {matches.emergency ? <DisclaimerCard /> : null}
      {matches.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.items.map(({ resource, reasons }) => (
            <li
              key={resource.slug}
              aria-label={resource.name[lang]}
              className="flex flex-col gap-2 rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{resource.name[lang]}</h3>
                <StatusBadge tone="info">{labels.supportKind[resource.kind]}</StatusBadge>
              </div>
              <p className="text-sm">{resource.description[lang]}</p>
              <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-muted-foreground">{t('languages')}</dt>
                <dd>{resource.languages.map((code) => languages.of(code) ?? code).join(', ')}</dd>
                <dt className="text-muted-foreground">{t('hours')}</dt>
                <dd>{resource.availableHours[lang]}</dd>
                <dt className="text-muted-foreground">{t('contact')}</dt>
                <dd className="flex items-center gap-1">
                  <Phone aria-hidden className="size-3.5" />
                  {resource.contact}
                </dd>
              </dl>
              <p className="text-sm text-muted-foreground">
                {t('matchedBecause', { reasons: reasonText(reasons) })}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t('fictional')}</p>
    </section>
  );
}

/** The same matches as a compact list, so the operator sees what the resident sees. */
export async function SupportMatchesPanel({ matches }: { matches: SupportMatchesResponse }) {
  const [t, labels, locale, reasonText] = await Promise.all([
    getTranslations('support'),
    getEnumLabels(),
    getLocale(),
    getReasonText(),
  ]);
  const lang = locale as Locale;
  return (
    <section className="staff-panel flex flex-col gap-2" aria-labelledby="case-support">
      <h2 id="case-support" className="flex items-center gap-2 font-semibold">
        <HeartHandshake aria-hidden className="size-4 text-primary" />
        {t('staffTitle')}
      </h2>
      {matches.emergency ? (
        <p className="text-sm font-semibold text-destructive">{t('emergency')}</p>
      ) : null}
      {matches.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('none')}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {matches.items.map(({ resource, reasons }) => (
            <li key={resource.slug} className="flex flex-col">
              <span className="font-medium">
                {resource.name[lang]}{' '}
                <span className="text-muted-foreground">({labels.supportKind[resource.kind]})</span>
              </span>
              <span className="text-xs text-muted-foreground">{reasonText(reasons)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t('staffNote')}</p>
    </section>
  );
}
