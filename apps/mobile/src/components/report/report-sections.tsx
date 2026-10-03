import {
  enumLabels,
  reportTimeline,
  type MatchReason,
  type ReportDetail,
  type RoutingResult,
  type SupportMatchesResponse,
} from '@haven/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Alert } from '@/components/form';
import { Action, Card, Heading, Label, Note, Toggle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

import { EmergencyNotice } from './emergency-notice';

function Row({ term, value }: { term: string; value: string }) {
  return (
    <View accessible style={{ gap: Spacing.xxs }}>
      <Note>{term}</Note>
      <Label>{value}</Label>
    </View>
  );
}

/** Reference and status, with the filing confirmation once filed. */
export function StatusCard({ report }: { report: ReportDetail }) {
  const { t } = useTranslation();
  const filed = report.state === 'submitted';
  return (
    <Card>
      {filed && report.reference ? (
        <>
          <Heading>{t('report.filedTitle')}</Heading>
          <Label>{t('report.filedBody', { reference: report.reference })}</Label>
        </>
      ) : (
        <>
          <Heading>{t('report.draft')}</Heading>
          <Note>{t('report.draftLead')}</Note>
        </>
      )}
      <Row term={t('report.reference')} value={report.reference ?? t('report.referencePending')} />
      <Row term={t('report.status')} value={filed ? t('report.filed') : t('report.draft')} />
      {report.escalated ? (
        <Label style={{ fontWeight: '600' }}>{t('report.escalated')}</Label>
      ) : null}
    </Card>
  );
}

/** Where the Smart Router sent a filed report. Rule-based, not AI, and simulated. */
export function RoutingCard({ routing }: { routing: RoutingResult }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const labels = enumLabels[locale];
  return (
    <Card>
      <Heading>{t('routing.title')}</Heading>
      <Row term={t('routing.responder')} value={labels.organization[routing.responder]} />
      <Row term={t('routing.queue')} value={labels.queuePriority[routing.queue]} />
      {routing.autoDispatch ? <Label>{t('routing.autoDispatch')}</Label> : null}
      {routing.confirmationRequired ? <Label>{t('routing.confirmationRequired')}</Label> : null}
      <Note>{t('routing.explain')}</Note>
      {routing.emergency ? (
        <Label style={{ color: colors.destructive, fontWeight: '600' }}>
          {t('routing.call112')}
        </Label>
      ) : null}
    </Card>
  );
}

export function MessagesCard({ report }: { report: ReportDetail }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Card>
      <Heading>{t('messages.title')}</Heading>
      {report.messages.length === 0 ? <Note>{t('messages.empty')}</Note> : null}
      {report.messages.map((message) => (
        <View
          key={message.id}
          accessible
          style={{
            gap: Spacing.xs,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
            paddingLeft: Spacing.sm,
          }}
        >
          <Label style={{ fontWeight: '600' }}>{t(`messages.kind.${message.kind}`)}</Label>
          <Label>{message.body}</Label>
          <Note>{format.format(new Date(message.createdAt))}</Note>
        </View>
      ))}
    </Card>
  );
}

export function HistoryCard({ report }: { report: ReportDetail }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Card>
      <Heading>{t('report.history')}</Heading>
      {reportTimeline(report.revisions).map((event) => (
        <View key={event.revision} accessible style={{ gap: Spacing.xxs }}>
          <Label>{t(`report.event.${event.kind}`)}</Label>
          <Note>{format.format(new Date(event.at))}</Note>
        </View>
      ))}
    </Card>
  );
}

function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    // Not every JavaScript engine ships display names.
    return code.toUpperCase();
  }
}

/** Fictional city resources matched to a filed report. */
export function SupportCard({ matches }: { matches: SupportMatchesResponse }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const labels = enumLabels[locale];
  const reasonText = (reasons: MatchReason[]) =>
    reasons
      .map((reason) => {
        switch (reason.type) {
          case 'category':
            return labels.category[reason.value];
          case 'district':
            return labels.district[reason.value];
          case 'citywide':
            return t('support.citywide');
          case 'keyword':
            return t('support.keyword', { keyword: reason.value });
          case 'severity':
            return labels.severity[reason.value];
        }
      })
      .join(' · ');

  return (
    <Card>
      <Heading>{t('support.title')}</Heading>
      {matches.emergency ? <EmergencyNotice /> : null}
      {matches.items.length === 0 ? <Note>{t('support.none')}</Note> : null}
      {matches.items.map(({ resource, reasons }) => (
        <View
          key={resource.slug}
          style={{
            gap: Spacing.xs,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: Radius.md,
            padding: Spacing.sm + Spacing.xs,
          }}
        >
          <Label accessibilityRole="header" style={{ fontWeight: '600' }}>
            {resource.name[locale]}
          </Label>
          <Note>{labels.supportKind[resource.kind]}</Note>
          <Label>{resource.description[locale]}</Label>
          <Row
            term={t('support.languages')}
            value={resource.languages.map((code) => languageName(code, locale)).join(', ')}
          />
          <Row term={t('support.hours')} value={resource.availableHours[locale]} />
          <Row term={t('support.contact')} value={resource.contact} />
          <Note>{t('support.matchedBecause', { reasons: reasonText(reasons) })}</Note>
        </View>
      ))}
      <Note>{t('support.fictional')}</Note>
    </Card>
  );
}

/** Escalation after a (simulated) identity check. */
export function EscalateCard({
  reportId,
  onEscalated,
}: {
  reportId: string;
  onEscalated: () => void;
}) {
  const { t } = useTranslation();
  const { token } = useSession();
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<'unconfirmed' | 'failed' | null>(null);

  async function escalate() {
    if (!verified) return setError('unconfirmed');
    setPending(true);
    setError(null);
    try {
      await api.reports.escalate(reportId, { verificationConfirmed: true }, { token });
      onEscalated();
    } catch {
      setError('failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <Heading>{t('escalation.title')}</Heading>
      <Note>{t('escalation.lead')}</Note>
      <Toggle label={t('escalation.verification')} value={verified} onValueChange={setVerified} />
      <Action
        label={pending ? t('escalation.escalating') : t('escalation.submit')}
        variant="destructive"
        disabled={pending}
        onPress={() => void escalate()}
      />
      {error ? (
        <Alert>
          {error === 'unconfirmed' ? t('escalation.unconfirmed') : t('escalation.failed')}
        </Alert>
      ) : null}
    </Card>
  );
}
