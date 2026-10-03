import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'info' | 'attention' | 'success' | 'danger';

const tones: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted text-foreground',
  info: 'border-primary/30 bg-secondary text-secondary-foreground',
  attention: 'border-warning/40 bg-warning/10 text-warning',
  success: 'border-success/40 bg-success/10 text-success',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
};

const dots: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-primary',
  attention: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-destructive',
};

/** A status label. The text carries the meaning; colour only reinforces it. */
export function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', dots[tone])} />
      {children}
    </span>
  );
}
