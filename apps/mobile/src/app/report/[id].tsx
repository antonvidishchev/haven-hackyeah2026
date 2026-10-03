import { ApiError } from '@haven/api-client';
import type { EvidenceItem, ReportDetail, SupportMatchesResponse } from '@haven/shared';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator } from 'react-native';

import { EvidenceList } from '@/components/report/evidence-list';
import { ReportEditor } from '@/components/report/report-editor';
import {
  EscalateCard,
  HistoryCard,
  MessagesCard,
  RoutingCard,
  StatusCard,
  SupportCard,
} from '@/components/report/report-sections';
import { Action, Card, Heading, Label, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/session/SessionProvider';

type Load = 'loading' | 'ready' | 'notFound' | 'failed';

export default function ReportScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, status } = useSession();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [matches, setMatches] = useState<SupportMatchesResponse | null>(null);
  const [load, setLoad] = useState<Load>('loading');
  const [editing, setEditing] = useState(false);
  // Remounts the editor from the server's copy after a conflict.
  const [editorKey, setEditorKey] = useState(0);
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    if (!token || !id) return;
    const request = ++latestRequest.current;
    try {
      const next = await api.reports.get(id, { token });
      if (request !== latestRequest.current) return;
      setReport(next);
      setLoad('ready');
      if (next.state === 'submitted') {
        const support = await api.reports.supportMatches(id, { token }).catch(() => null);
        if (request === latestRequest.current) setMatches(support);
      }
    } catch (error) {
      if (request !== latestRequest.current) return;
      const missing = error instanceof ApiError && (error.status === 404 || error.status === 403);
      setLoad((current) =>
        current === 'ready' && !missing ? current : missing ? 'notFound' : 'failed',
      );
    }
  }, [id, token]);

  // Refetch on focus, e.g. after recording audio for this report.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onEvidence = (update: (list: EvidenceItem[]) => EvidenceItem[]) => {
    setReport((current) =>
      current ? { ...current, evidence: update(current.evidence) } : current,
    );
    void refresh();
  };

  const title = report?.reference ?? t('report.title');

  if (load !== 'ready' || !report) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('report.title') }} />
        {load === 'loading' || status === 'loading' ? (
          <Card>
            <ActivityIndicator accessibilityLabel={t('report.loading')} />
            <Label>{t('report.loading')}</Label>
          </Card>
        ) : (
          <Card>
            <Label accessibilityRole="alert">
              {load === 'notFound' ? t('report.notFound') : t('report.loadFailed')}
            </Label>
            {load === 'failed' ? (
              <Action label={t('report.retry')} onPress={() => void refresh()} />
            ) : null}
          </Card>
        )}
      </Screen>
    );
  }

  const filed = report.state === 'submitted';

  if (!filed || editing) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <StatusCard report={report} />
        {editing ? (
          <Action
            label={t('report.doneEditing')}
            variant="outlined"
            onPress={() => setEditing(false)}
          />
        ) : null}
        <ReportEditor
          key={editorKey}
          report={report}
          onChange={setReport}
          onEvidence={onEvidence}
          onReset={() => {
            setEditorKey((key) => key + 1);
            void refresh();
          }}
          onFiled={() => {
            setEditing(false);
            AccessibilityInfo.announceForAccessibility(t('report.filedTitle'));
            void refresh();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <StatusCard report={report} />
      {report.routing ? <RoutingCard routing={report.routing} /> : null}
      <MessagesCard report={report} />
      {matches ? <SupportCard matches={matches} /> : null}
      <Card>
        <Heading>{t('evidence.title')}</Heading>
        <EvidenceList items={report.evidence} />
      </Card>
      <Action label={t('report.edit')} onPress={() => setEditing(true)} />
      <HistoryCard report={report} />
      {report.escalated ? null : (
        <EscalateCard reportId={report.id} onEscalated={() => void refresh()} />
      )}
    </Screen>
  );
}
