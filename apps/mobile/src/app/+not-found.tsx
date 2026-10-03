import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Label, Screen } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <Screen>
        <Label>{t('notFound.body')}</Label>
        <Link href="/" style={{ color: colors.primary, fontSize: 16, paddingVertical: 12 }}>
          {t('notFound.home')}
        </Link>
      </Screen>
    </>
  );
}
