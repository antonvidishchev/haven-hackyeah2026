'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { escalateReport, type EscalateState } from '@/app/actions/reports';

/** Lets a resident escalate a filed report after a (simulated) identity check. */
export function EscalateCard({ reportId }: { reportId: string }) {
  const t = useTranslations('escalation');
  const [state, action, pending] = useActionState<EscalateState, FormData>(
    escalateReport.bind(null, reportId),
    {},
  );
  return (
    <section aria-labelledby="escalate-title" className="resident-card">
      <h2 id="escalate-title" className="text-lg font-semibold">
        {t('title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('lead')}</p>
      <form action={action} className="flex flex-col gap-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="verification" className="mt-0.5" required />
          <span className="font-medium">{t('verification')}</span>
        </label>
        <button type="submit" className="resident-button destructive self-start" disabled={pending}>
          {pending ? t('escalating') : t('submit')}
        </button>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error === 'unconfirmed' ? t('unconfirmed') : t('failed')}
          </p>
        ) : null}
      </form>
    </section>
  );
}
