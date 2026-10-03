import { useTranslation } from 'react-i18next';

import { Card, Label, Note } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

/** The 112 notice: Haven is not an emergency service. */
export function EmergencyNotice() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={{ borderColor: colors.warning, borderWidth: 1 }}>
      <Label accessibilityRole="header" style={{ fontWeight: '600' }}>
        {t('home.emergencyTitle')}
      </Label>
      <Note>{t('home.emergencyBody')}</Note>
    </Card>
  );
}
