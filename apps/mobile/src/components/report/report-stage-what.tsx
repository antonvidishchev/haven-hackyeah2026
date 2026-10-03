import {
  enumLabels,
  linkEmergency,
  reportCategories,
  severities,
  type ReportFields,
} from '@haven/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SelectField, TextField } from '@/components/form';
import { Toggle } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';

type EventChoice = 'unset' | 'now' | 'hour' | 'today' | 'yesterday';

const HOUR = 3_600_000;

/** Approximate times are enough; a date picker is more than most residents need here. */
function eventTimeFor(choice: EventChoice): string | null {
  const now = Date.now();
  const offsets: Record<Exclude<EventChoice, 'unset'>, number> = {
    now: 0,
    hour: HOUR,
    today: 3 * HOUR,
    yesterday: 24 * HOUR,
  };
  if (choice === 'unset') return null;
  // Whole minutes, so a later save of the same choice isn't a change.
  return new Date(Math.floor((now - offsets[choice]) / 60_000) * 60_000).toISOString();
}

export function ReportStageWhat({
  fields,
  locked,
  change,
  set,
  current,
}: {
  fields: ReportFields;
  locked: boolean;
  change: (next: ReportFields) => void;
  set: <K extends keyof ReportFields>(key: K, value: ReportFields[K]) => void;
  /** The latest fields, for changes that depend on more than one field. */
  current: () => ReportFields;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const labels = enumLabels[locale];
  const eventLabel = fields.eventTime
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(fields.eventTime),
      )
    : t('editor.eventUnset');
  const choiceLabels: Record<EventChoice, string> = {
    unset: t('editor.eventUnset'),
    now: t('editor.eventNow'),
    hour: t('editor.eventHour'),
    today: t('editor.eventToday'),
    yesterday: t('editor.eventYesterday'),
  };
  // The current value is listed first, so an exact time set on the web isn't lost.
  const eventOptions = [
    { value: 'current', label: eventLabel },
    ...(Object.keys(choiceLabels) as EventChoice[])
      .filter((choice) => choice !== 'unset' || fields.eventTime)
      .map((choice) => ({ value: choice, label: choiceLabels[choice] })),
  ];

  return (
    <View style={{ gap: Spacing.md }}>
      <SelectField
        label={t('editor.category')}
        hint={t('editor.categoryHint')}
        value={fields.category}
        options={reportCategories.map((value) => ({ value, label: labels.category[value] }))}
        onChange={(value) => set('category', value)}
      />
      <TextField
        label={t('editor.description')}
        hint={t('editor.descriptionHint')}
        value={fields.description}
        maxLength={10_000}
        multiline
        onChangeText={(value) => set('description', value)}
      />
      <SelectField
        label={t('editor.eventTime')}
        hint={t('editor.eventTimeHint')}
        value="current"
        options={eventOptions}
        onChange={(value) => {
          if (value !== 'current') set('eventTime', eventTimeFor(value as EventChoice));
        }}
      />
      <SelectField
        label={t('editor.severity')}
        hint={locked ? t('editor.lockedHint') : undefined}
        value={fields.severity}
        disabled={locked}
        options={[
          { value: null, label: t('editor.severityUnset') },
          ...severities.map((value) => ({ value, label: labels.severity[value] })),
        ]}
        onChange={(severity) => change(linkEmergency(current(), { severity }))}
      />
      <Toggle
        label={t('editor.weapon')}
        description={t('editor.weaponHint')}
        value={fields.weaponOrImmediateThreat}
        disabled={locked}
        onValueChange={(value) =>
          change(linkEmergency(current(), { weaponOrImmediateThreat: value }))
        }
      />
      <Toggle
        label={t('editor.repeat')}
        description={locked ? t('editor.lockedHint') : undefined}
        value={fields.isRepeatIncident}
        disabled={locked}
        onValueChange={(value) => set('isRepeatIncident', value)}
      />
    </View>
  );
}
