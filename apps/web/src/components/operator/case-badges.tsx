import { getTranslations } from 'next-intl/server';
import type { OperatorCaseSummary } from '@haven/shared';

import { StatusBadge, type StatusTone } from '@/components/haven/status-badge';
import { getEnumLabels } from '@/i18n/labels';

const queueTone = {
  jumps_queue: 'danger',
  fast_laned: 'attention',
  expedited: 'attention',
  normal: 'neutral',
} as const satisfies Record<OperatorCaseSummary['queue'], StatusTone>;

const stateTone = {
  open: 'info',
  in_review: 'info',
  closed: 'success',
  cancelled: 'neutral',
} as const satisfies Record<OperatorCaseSummary['state'], StatusTone>;

/** Priority, case state, "AI suggests" and escalation, as text-carrying badges. */
export async function CaseBadges({ summary }: { summary: OperatorCaseSummary }) {
  const [t, labels] = await Promise.all([getTranslations('queue'), getEnumLabels()]);
  return (
    <span className="flex flex-wrap gap-1.5">
      <StatusBadge tone={queueTone[summary.queue]}>
        {labels.queuePriority[summary.queue]}
      </StatusBadge>
      <StatusBadge tone={stateTone[summary.state]}>{labels.caseState[summary.state]}</StatusBadge>
      {summary.hasSuggestion ? <StatusBadge tone="info">{t('aiSuggests')}</StatusBadge> : null}
      {summary.escalated ? <StatusBadge tone="danger">{t('escalated')}</StatusBadge> : null}
    </span>
  );
}
