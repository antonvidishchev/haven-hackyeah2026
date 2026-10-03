import { useTranslation } from 'react-i18next';

import { Card, Label, Note, Screen } from '@/components/ui';

export default function MyReportsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Card>
        <Label>{t('myReports.empty')}</Label>
        <Note>{t('myReports.later')}</Note>
      </Card>
    </Screen>
  );
}
