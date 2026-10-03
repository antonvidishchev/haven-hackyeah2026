import { getTranslations } from 'next-intl/server';

/** A ring-tailed lemur, the team's mascot. Decorative. */
function Lemur({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      {/* Ringed tail: a light stroke with dark dashes on top. */}
      <path
        d="M24 34 C34 34 37 26 34 18 C32 12 33 6 38 4"
        fill="none"
        stroke="#f4f4f0"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <path
        d="M24 34 C34 34 37 26 34 18 C32 12 33 6 38 4"
        fill="none"
        stroke="#1c1c1c"
        strokeWidth={4.5}
        strokeDasharray="3.2 3.2"
      />
      <ellipse cx={18} cy={31} rx={8} ry={7.5} fill="#8a8f94" />
      <path d="M10.5 12 L8 4.5 L14.5 9 Z M25.5 12 L28 4.5 L21.5 9 Z" fill="#5b6066" />
      <ellipse cx={18} cy={16} rx={9} ry={8} fill="#8a8f94" />
      <ellipse cx={18} cy={18.5} rx={7} ry={6.5} fill="#f4f4f0" />
      <ellipse cx={14.6} cy={17.2} rx={2.6} ry={3} fill="#1c1c1c" />
      <ellipse cx={21.4} cy={17.2} rx={2.6} ry={3} fill="#1c1c1c" />
      <circle cx={14.6} cy={17.2} r={1.4} fill="#f5a623" />
      <circle cx={21.4} cy={17.2} r={1.4} fill="#f5a623" />
      <circle cx={14.6} cy={17.2} r={0.6} fill="#1c1c1c" />
      <circle cx={21.4} cy={17.2} r={0.6} fill="#1c1c1c" />
      <path d="M15.6 20.5 Q18 26.5 20.4 20.5 Z" fill="#2a2a2a" />
    </svg>
  );
}

/** Credits the author and the event, pinned to the top of every page (2.25rem tall on one line). */
export async function CreditBar() {
  const t = await getTranslations('common');
  return (
    <aside
      aria-label={t('creditLabel')}
      className="sticky top-0 z-40 flex min-h-9 shrink-0 items-center justify-center gap-2 bg-primary px-4 py-0.5 text-center text-sm font-medium text-primary-foreground"
    >
      <Lemur className="size-7 shrink-0" />
      <span>{t('credit')}</span>
    </aside>
  );
}
