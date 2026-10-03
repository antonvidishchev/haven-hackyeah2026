import { cn } from '@/lib/utils';

/** The 3-step stepper. Steps before `current` are done; the current one is marked as the step. */
export function ReportStages({
  label,
  steps,
  current,
  className,
}: {
  label: string;
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn('report-stages', className)}>
      {steps.map((step, index) => (
        <li
          key={step}
          data-state={index < current ? 'done' : undefined}
          aria-current={index === current ? 'step' : undefined}
        >
          {step}
        </li>
      ))}
    </ol>
  );
}
