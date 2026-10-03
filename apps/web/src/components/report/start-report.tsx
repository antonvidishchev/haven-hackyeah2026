'use client';

import { Plus } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { startReport, type StartReportState } from '@/app/actions/reports';

/**
 * Starts a draft as soon as the page is open in a browser. Creating it here rather than while
 * rendering keeps prefetches and crawlers from making drafts; the button covers no-JS visits.
 */
export function StartReport({ auto = false }: { auto?: boolean }) {
  const t = useTranslations('reportNew');
  const [state, action, pending] = useActionState<StartReportState>(startReport, {});
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    form.current?.requestSubmit();
  }, [auto]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-3">
      <button type="submit" className="resident-button self-start" disabled={pending}>
        <Plus aria-hidden className="size-5" />
        {pending ? t('starting') : t('start')}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {t(`error.${state.error}`)}
        </p>
      ) : null}
    </form>
  );
}
