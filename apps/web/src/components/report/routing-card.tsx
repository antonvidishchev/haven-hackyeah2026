import { Route } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { RoutingResult } from '@haven/shared';

import { SimulationNote } from '@/components/haven/simulation-note';
import { StatusBadge } from '@/components/haven/status-badge';
import { getEnumLabels } from '@/i18n/labels';

/** Where the Smart Router sent a filed report. Rule-based, not AI, and simulated. */
export async function RoutingCard({ routing }: { routing: RoutingResult }) {
  const [t, labels] = await Promise.all([getTranslations('routing'), getEnumLabels()]);
  return (
    <section aria-labelledby="routing-title" className="resident-card">
      <h2 id="routing-title" className="flex items-center gap-2 text-lg font-semibold">
        <Route aria-hidden className="size-5 text-primary" />
        {t('title')}
      </h2>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">{t('responder')}</dt>
        <dd className="font-medium">{labels.organization[routing.responder]}</dd>
        <dt className="text-muted-foreground">{t('queue')}</dt>
        <dd>
          <StatusBadge tone={routing.queue === 'jumps_queue' ? 'danger' : 'info'}>
            {labels.queuePriority[routing.queue]}
          </StatusBadge>
        </dd>
      </dl>
      {routing.autoDispatch || routing.confirmationRequired ? (
        <ul className="flex flex-col gap-1 text-sm">
          {routing.autoDispatch ? <li>{t('autoDispatch')}</li> : null}
          {routing.confirmationRequired ? (
            <li>
              <span className="font-medium">{t('confirmationRequired')}</span>{' '}
              <span className="text-muted-foreground">{t('confirmationHint')}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
      <p className="text-sm text-muted-foreground">{t('explain')}</p>
      {routing.emergency ? (
        <p className="text-sm font-semibold text-destructive">{t('call112')}</p>
      ) : null}
      <SimulationNote />
    </section>
  );
}
