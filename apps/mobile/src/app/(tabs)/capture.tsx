import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Action, Card, Label, Note, Screen } from '@/components/ui';

export default function CaptureScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <Label>{t('capture.intro')}</Label>
      <Action
        label={t('capture.audio')}
        onPress={() => router.push({ pathname: '/record', params: { mode: 'audio' } })}
      />
      <Action
        label={t('capture.video')}
        onPress={() => router.push({ pathname: '/record', params: { mode: 'video' } })}
      />
      <Card>
        <Note>{t('capture.foreground')}</Note>
        <Note>{t('capture.never')}</Note>
      </Card>
    </Screen>
  );
}
