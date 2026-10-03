import {
  filingGaps,
  REPORT_STAGES,
  type EvidenceItem,
  type ReportDetail,
  type ReportStage,
} from '@haven/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/components/form';
import { Action, Card, Heading, Label, Note } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

import { FilingChecklist } from './filing-checklist';
import { ReportStageEvidence } from './report-stage-evidence';
import { ReportStageWhat } from './report-stage-what';
import { ReportStageWhere } from './report-stage-where';
import { useReportEditor, type FilingError } from './use-report-editor';

/** The stage indicator: three steps, the current one marked selected. */
function StageIndicator({
  stage,
  onSelect,
}: {
  stage: ReportStage;
  onSelect: (stage: ReportStage) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const index = REPORT_STAGES.indexOf(stage);
  const titles = stageTitles(t);
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('editor.stagesLabel')}
      style={styles.steps}
    >
      {REPORT_STAGES.map((value, i) => {
        const current = value === stage;
        const done = i < index;
        return (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: current }}
            accessibilityLabel={t('editor.stepLabel', { n: i + 1, title: titles[value] })}
            onPress={() => onSelect(value)}
            style={[
              styles.step,
              {
                borderColor: current || done ? colors.primary : colors.border,
                backgroundColor: current ? colors.primary : colors.backgroundElement,
              },
            ]}
          >
            <Text style={[styles.stepNumber, { color: current ? colors.onPrimary : colors.text }]}>
              {i + 1}
            </Text>
            <Text
              numberOfLines={2}
              style={[styles.stepTitle, { color: current ? colors.onPrimary : colors.text }]}
            >
              {titles[value]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const stageTitles = (
  t: (key: 'editor.stageWhat' | 'editor.stageWhere' | 'editor.stageEvidence') => string,
) => ({
  what: t('editor.stageWhat'),
  where: t('editor.stageWhere'),
  evidence: t('editor.stageEvidence'),
});

/**
 * The three-stage report wizard, matching the web editor. A draft autosaves; a filed report
 * keeps its locked fields and saves on "Save changes".
 */
export function ReportEditor({
  report,
  onChange,
  onEvidence,
  onReset,
  onFiled,
}: {
  report: ReportDetail;
  /** The server's latest copy, after a save or filing. */
  onChange: (report: ReportDetail) => void;
  /** Evidence changed: update the list now, then fetch the server's copy. */
  onEvidence: (update: (list: EvidenceItem[]) => EvidenceItem[]) => void;
  /** Starts over from the server's copy after a conflict. */
  onReset: () => void;
  onFiled: () => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { token } = useSession();
  const editor = useReportEditor(report, token, onChange);
  const [stage, setStage] = useState<ReportStage>('what');
  const [filing, setFiling] = useState(false);
  const [filingError, setFilingError] = useState<Exclude<FilingError, 'conflict'> | null>(null);

  const { fields, save, filed } = editor;
  const evidence = report.evidence;
  const stageIndex = REPORT_STAGES.indexOf(stage);
  const gaps = filingGaps(fields, evidence.length);
  const titles = stageTitles(t);
  const current = () => editor.latest.current;

  function goTo(next: ReportStage) {
    setStage(next);
    if (!filed) void editor.saveNow();
    AccessibilityInfo.announceForAccessibility(titles[next]);
  }

  async function file() {
    setFiling(true);
    setFilingError(null);
    const error = await editor.file();
    setFiling(false);
    if (error === 'conflict') return;
    if (error) return setFilingError(error);
    onFiled();
  }

  async function removeEvidence(id: string) {
    try {
      await api.evidence.remove(id, { token });
    } catch {
      // Already gone is fine; anything else leaves the file listed.
    }
    onEvidence((list) => list.filter((item) => item.id !== id));
  }

  const timeFormat = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  const saveStatus =
    save.kind === 'saving'
      ? t('editor.saving')
      : filed && editor.dirty
        ? t('editor.unsaved')
        : save.kind === 'saved'
          ? t('editor.savedAt', { time: timeFormat.format(save.at) })
          : save.kind === 'failed'
            ? t('editor.saveFailed')
            : '';

  return (
    <View style={{ gap: Spacing.md }}>
      <StageIndicator stage={stage} onSelect={goTo} />

      {save.kind === 'conflict' ? (
        <Card>
          <Alert>{t('editor.conflictTitle')}</Alert>
          <Note>{t('editor.conflictBody')}</Note>
          <Action label={t('editor.reload')} variant="outlined" onPress={onReset} />
        </Card>
      ) : null}

      <Heading>{titles[stage]}</Heading>

      {stage === 'what' ? (
        <ReportStageWhat
          fields={fields}
          locked={filed}
          change={editor.change}
          set={editor.set}
          current={current}
        />
      ) : null}
      {stage === 'where' ? (
        <>
          <ReportStageWhere
            fields={fields}
            change={editor.change}
            set={editor.set}
            current={current}
          />
          <FilingChecklist gaps={gaps} />
        </>
      ) : null}
      {stage === 'evidence' ? (
        <ReportStageEvidence
          reportId={report.id}
          fields={fields}
          evidence={evidence}
          gaps={gaps}
          filed={filed}
          onUploaded={(item) => onEvidence((list) => [...list, item])}
          onRemove={removeEvidence}
        />
      ) : null}

      <View style={{ gap: Spacing.sm }}>
        {stageIndex < REPORT_STAGES.length - 1 ? (
          <Action
            label={t('editor.continue')}
            onPress={() => goTo(REPORT_STAGES[stageIndex + 1]!)}
          />
        ) : null}
        {!filed && stage === 'evidence' ? (
          <Action
            label={filing ? t('editor.filing') : t('editor.file')}
            disabled={gaps.length > 0 || filing || save.kind === 'conflict'}
            accessibilityHint={gaps.length > 0 ? t('editor.fileBlocked') : t('editor.fileHint')}
            onPress={() => void file()}
          />
        ) : null}
        {stageIndex > 0 ? (
          <Action
            label={t('editor.back')}
            variant="outlined"
            onPress={() => goTo(REPORT_STAGES[stageIndex - 1]!)}
          />
        ) : null}
        {filed ? (
          <Action
            label={t('editor.saveChanges')}
            variant={stage === 'evidence' ? 'filled' : 'outlined'}
            disabled={save.kind === 'conflict' || !editor.dirty}
            onPress={() => void editor.saveNow()}
          />
        ) : (
          <Action
            label={t('editor.saveDraft')}
            variant="outlined"
            disabled={save.kind === 'conflict'}
            onPress={() => void editor.saveNow()}
          />
        )}
        {!filed && stage === 'evidence' ? (
          <Note>{gaps.length > 0 ? t('editor.fileBlocked') : t('editor.fileHint')}</Note>
        ) : null}
        {filingError ? (
          <Alert>
            {filingError === 'incomplete' ? t('editor.fileIncomplete') : t('editor.fileFailed')}
          </Alert>
        ) : null}
        <Label accessibilityLiveRegion="polite" style={styles.status}>
          {saveStatus}
        </Label>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: Spacing.sm },
  step: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  stepNumber: { fontSize: FontSize.note, fontWeight: '700' },
  stepTitle: { fontSize: FontSize.note, fontWeight: '600' },
  status: { fontSize: FontSize.note },
});
