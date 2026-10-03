'use client';

import { useOptimistic, useTransition } from 'react';

import { setTheme } from '@/app/actions/preferences';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { isTheme, themes, type Theme } from '@/lib/theme';

export function ThemeChoice({
  value,
  labels,
  legend,
}: {
  value: Theme;
  labels: Record<Theme, string>;
  legend: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [, startTransition] = useTransition();

  return (
    <RadioGroup
      aria-label={legend}
      value={optimistic}
      onValueChange={(next) => {
        if (!isTheme(next)) return;
        startTransition(async () => {
          setOptimistic(next);
          await setTheme(next);
        });
      }}
    >
      {themes.map((theme) => (
        <Label
          key={theme}
          className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-4 text-base font-normal has-data-checked:border-primary"
        >
          <RadioGroupItem value={theme} />
          {labels[theme]}
        </Label>
      ))}
    </RadioGroup>
  );
}
