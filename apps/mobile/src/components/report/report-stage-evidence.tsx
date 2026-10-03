import { enumLabels, type EvidenceItem, type FilingGap, type ReportFields } from '@haven/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, Heading, Label, Note } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';

import { EmergencyNotice } from './emergency-notice';
import { EvidenceList } from './evidence-list';
import { EvidenceUploader } from './evidence-uploader';
import { FilingChecklist } from './filing-checklist';

export function ReportStageEvidence({
  reportId,
  fields,
  evidence,
  gaps,
  filed,
  onUploaded,
  onRemove,
}: {
  reportId: string;
  fields: ReportFields;
  evidence: EvidenceItem[];
  gaps: FilingGap[];
  filed: boolean;
  onUploaded: (item: EvidenceItem) => void;
  onRemove: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const labels = enumLabels[locale];
  const notGiven = t('editor.notGiven');
  const place =
    [fields.location ? t('editor.pinned') : null, fields.locationLabel.trim() || null]
      .filter(Boolean)
      .join(' · ') || notGiven;
  const rows: [string, string][] = [
    [t('editor.category'), labels.category[fields.category]],
    [t('editor.severity'), fields.severity ? labels.severity[fields.severity] : notGiven],
    [
      t('editor.eventTime'),
      fields.eventTime
        ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(fields.eventTime),
          )
        : notGiven,
    ],
    [t('editor.district'), fields.zoneId ? labels.district[fields.zoneId] : notGiven],
    [t('editor.place'), place],
    [t('editor.description'), fields.description.trim() || notGiven],
    [t('evidence.title'), String(evidence.length)],
  ];

  return (
    <View style={{ gap: Spacing.md }}>
      <Card>
        <Heading>{t('evidence.title')}</Heading>
        <EvidenceList items={evidence} onRemove={filed ? undefined : onRemove} />
        <EvidenceUploader reportId={reportId} onUploaded={onUploaded} />
        <Label style={{ fontWeight: '600' }}>{t('evidence.vaultTitle')}</Label>
        <Note>{t('evidence.vaultBody')}</Note>
        <Note>{t('evidence.notScanned')}</Note>
      </Card>

      <Card>
        <Heading>{t('editor.summary')}</Heading>
        {rows.map(([term, value]) => (
          <View key={term} accessible style={{ gap: Spacing.xxs }}>
            <Note>{term}</Note>
            <Label>{value}</Label>
          </View>
        ))}
      </Card>

      {filed ? null : <FilingChecklist gaps={gaps} />}
      <EmergencyNotice />
    </View>
  );
}
