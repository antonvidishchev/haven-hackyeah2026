import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

// Importing @/i18n also initialises i18next before any screen renders.
import { loadStoredLocale } from '@/i18n';
import { SessionProvider } from '@/session/SessionProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

export { ErrorBoundary } from 'expo-router';

function ThemedNavigation() {
  const { colors, scheme } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.backgroundElement,
        text: colors.text,
        border: colors.border,
        notification: colors.destructive,
      },
    };
  }, [colors, scheme]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void loadStoredLocale();
  }, []);

  return (
    <ThemeProvider>
      <SessionProvider>
        <ThemedNavigation />
      </SessionProvider>
    </ThemeProvider>
  );
}
