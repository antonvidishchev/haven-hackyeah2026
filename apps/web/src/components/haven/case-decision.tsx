'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button, buttonVariants } from '@/components/ui/button';
import type { DecisionError, DecisionResult } from '@/lib/case-decision';

/** Pending, error and success state for one staff decision panel. */
export function useCaseDecision() {
  const [error, setError] = useState<DecisionError | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<DecisionResult>, doneMessage: string) {
    setPending(true);
    setError(null);
    setDone(null);
    try {
      const result = await action();
      if (result.ok) {
        setDone(doneMessage);
        return true;
      }
      setError(result.error);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { error, done, pending, run, clearError: () => setError(null) };
}

/** The outcome of the last decision: a status line, or an alert with "Reload case" on conflict. */
export function DecisionFeedback({
  error,
  done,
  onDismiss,
  backHref,
  backLabel,
}: {
  error: DecisionError | null;
  done: string | null;
  onDismiss: () => void;
  backHref: string;
  backLabel: string;
}) {
  const t = useTranslations('decision');
  const router = useRouter();
  return (
    <>
      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3"
        >
          <p className="text-sm font-medium text-destructive">{t(`error.${error}`)}</p>
          {error === 'stale' || error === 'closed' ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  onDismiss();
                  router.refresh();
                }}
              >
                {t('reload')}
              </Button>
              <Link href={backHref} className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
                {backLabel}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      {done ? (
        <p role="status" className="text-sm font-medium text-success">
          {done}
        </p>
      ) : null}
    </>
  );
}
