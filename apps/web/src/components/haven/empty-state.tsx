import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center',
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-8 text-muted-foreground" /> : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? <div className="max-w-md text-sm text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
