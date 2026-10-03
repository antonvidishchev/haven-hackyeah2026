import { FlaskConical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/** Labels a simulated element honestly. Defaults to the generic prototype notice. */
export function SimulationNote({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations('common');
  return (
    <p
      className={cn(
        'inline-flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground',
        className,
      )}
    >
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children ?? t('simulation')}</span>
    </p>
  );
}
