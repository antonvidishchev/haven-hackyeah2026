import type { SVGProps } from 'react';

/** The Haven mark, drawn in `currentColor`. Decorative unless given a `title`. */
export function HavenMark({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M8 27 L32 9 L56 27" />
      <path d="M19 18.75 V56" />
      <path d="M19 42 Q19 33 32.5 33 Q46 33 46 42 V56" />
    </svg>
  );
}

export function HavenLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-foreground ${className ?? ''}`}>
      <HavenMark className="size-7 text-primary" />
      <span className="text-xl font-semibold tracking-tight">Haven</span>
    </span>
  );
}
