import { locales } from '@haven/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SessionSection } from '@/components/session';
import { Card, Choice, Label, Note, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import { themePreferences, useTheme } from '@/theme/ThemeProvider';

export default function AccountScreen() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const { locale, setLocale } = useLocale();

  return (
    <Screen>
      <SessionSection />

      <Note>{t('account.intro')}</Note>

      <Card>
        <Label accessibilityRole="header" style={{ fontWeight: '600' }}>
          {t('account.appearance')}
        </Label>
        <View accessibilityRole="radiogroup" style={{ gap: Spacing.sm }}>
          {themePreferences.map((option) => (
            <Choice
              key={option}
              label={t(`theme.${option}`)}
              description={option === 'system' ? t('theme.systemHint') : undefined}
              selected={preference === option}
              onSelect={() => setPreference(option)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Label accessibilityRole="header" style={{ fontWeight: '600' }}>
          {t('account.language')}
        </Label>
        <View accessibilityRole="radiogroup" style={{ gap: Spacing.sm }}>
          {locales.map((option) => (
            <Choice
              key={option}
              label={t(`language.${option}`)}
              selected={locale === option}
              onSelect={() => setLocale(option)}
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
}
