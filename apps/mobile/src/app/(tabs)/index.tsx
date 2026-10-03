import { useTranslation } from 'react-i18next';

import { Card, Label, Note, Screen, Title } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Screen>
      <Title>{t('home.title')}</Title>
      <Label>{t('home.intro')}</Label>
      <Note>{t('home.noAccount')}</Note>
      <Card style={{ borderColor: colors.warning }}>
        <Label accessibilityRole="header" style={{ fontWeight: '600' }}>
          {t('home.emergencyTitle')}
        </Label>
        <Note>{t('home.emergencyBody')}</Note>
      </Card>
    </Screen>
  );
}
