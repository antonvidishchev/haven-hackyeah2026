export const themes = ['system', 'light', 'dark'] as const;
export type Theme = (typeof themes)[number];
export const isTheme = (value: unknown): value is Theme =>
  typeof value === 'string' && (themes as readonly string[]).includes(value);
