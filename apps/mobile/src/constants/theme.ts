import { Platform } from 'react-native';

/**
 * Haven design tokens. Values mirror the web tokens in apps/web/src/app/globals.css
 * so both clients share one calm, high-contrast palette.
 */
export const Colors = {
  light: {
    text: '#213c33',
    background: '#f5f6f1',
    backgroundElement: '#ffffff',
    backgroundSelected: '#eceee7',
    textSecondary: '#56665f',
    primary: '#285f4e',
    onPrimary: '#ffffff',
    secondary: '#e3ece6',
    onSecondary: '#1f4a3d',
    border: '#d9ded5',
    input: '#7a8880',
    destructive: '#b42318',
    warning: '#8a5300',
    success: '#285f4e',
  },
  dark: {
    text: '#e4ece7',
    background: '#131e1a',
    backgroundElement: '#1b2a25',
    backgroundSelected: '#22322c',
    textSecondary: '#a3b3ab',
    primary: '#a6d4be',
    onPrimary: '#0f221b',
    secondary: '#263a33',
    onSecondary: '#e4ece7',
    border: '#2f433c',
    input: '#6b8078',
    destructive: '#f4867c',
    warning: '#f2c065',
    success: '#a6d4be',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = { [K in keyof (typeof Colors)['light']]: string };

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

/** System fonts only — no custom font loading. */
export const Fonts = Platform.select({
  ios: { sans: 'System', mono: 'Menlo' },
  android: { sans: 'sans-serif', mono: 'monospace' },
  default: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: 'ui-monospace, Menlo, monospace',
  },
});

export const FontSize = {
  tabLabel: 10,
  note: 13,
  body: 16,
  title: 22,
  heading: 28,
} as const;
