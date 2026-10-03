import type { ReportSummary } from '@haven/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert } from '@/components/form';
import { EmergencyNotice } from '@/components/report/emergency-notice';
import { Action, Card, Heading, Label, Note, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useStartReport } from '@/lib/use-start-report';
import { useSession } from '@/session/SessionProvider';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useSession();
  const report = useStartReport();
  const [draft, setDraft] = useState<ReportSummary | null>(null);

  // The newest draft, if any, so a resident can pick up where they left off.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let active = true;
      api.reports
        .list({ limit: 20 }, { token })
        .then((page) => {
          if (active) setDraft(page.items.find((item) => item.state === 'draft') ?? null);
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [token]),
  );

  return (
    <Screen>
      <Title>{t('home.title')}</Title>
      <Label>{t('home.intro')}</Label>
      <Note>{t('home.noAccount')}</Note>

      <Action
        label={report.busy ? t('home.starting') : t('home.report')}
        disabled={report.busy || !report.ready}
        onPress={() => void report.start()}
      />
      {report.failed ? <Alert>{t('home.startFailed')}</Alert> : null}
      <Action
        label={t('home.capture')}
        variant="outlined"
        accessibilityHint={t('home.captureHint')}
        onPress={() => router.push('/capture')}
      />

      {draft ? (
        <Card>
          <Heading>{t('home.draftTitle')}</Heading>
          <Label numberOfLines={3}>{draft.descriptionExcerpt || t('home.draftEmpty')}</Label>
          <Action
            label={t('home.continue')}
            variant="outlined"
            onPress={() => router.push({ pathname: '/report/[id]', params: { id: draft.id } })}
          />
        </Card>
      ) : null}

      <EmergencyNotice />
    </Screen>
  );
}
