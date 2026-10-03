import { useTranslation } from 'react-i18next';

import { Card, Label, Note, Screen } from '@/components/ui';

export default function CaptureScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Card>
        <Label>{t('capture.later')}</Label>
        <Note>{t('capture.note')}</Note>
      </Card>
    </Screen>
  );
}
