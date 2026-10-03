import {
  districtIds,
  enumLabels,
  findDistrict,
  type LatLng,
  type ReportFields,
} from '@haven/shared';
import * as Location from 'expo-location';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SelectField, TextField } from '@/components/form';
import { Action, Label, Note } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';

import { MapPicker } from './map-picker';

type Locating = 'idle' | 'busy' | 'denied' | 'outside';

const round = (value: number) => Math.round(value * 1e5) / 1e5;

export function ReportStageWhere({
  fields,
  change,
  set,
  current,
}: {
  fields: ReportFields;
  change: (next: ReportFields) => void;
  set: <K extends keyof ReportFields>(key: K, value: ReportFields[K]) => void;
  current: () => ReportFields;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const labels = enumLabels[locale];
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState<Locating>('idle');
  const pinDistrict = fields.location ? findDistrict(fields.location) : null;

  function setPin(point: LatLng | null) {
    const latest = current();
    change({ ...latest, location: point, zoneId: point ? findDistrict(point) : latest.zoneId });
  }

  // Asks for permission only when the resident taps the button, never on its own.
  async function locateMe() {
    setLocating('busy');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return setLocating('denied');
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const point = { lat: round(coords.latitude), lng: round(coords.longitude) };
      if (!findDistrict(point)) return setLocating('outside');
      setLocating('idle');
      setPin(point);
    } catch {
      setLocating('denied');
    }
  }

  const status =
    locating === 'busy'
      ? t('editor.locating')
      : locating === 'denied'
        ? t('editor.locationDenied')
        : locating === 'outside'
          ? t('editor.locationOutside')
          : '';

  return (
    <View style={{ gap: Spacing.md }}>
      <SelectField
        label={t('editor.district')}
        hint={fields.location ? t('editor.districtFromPin') : t('editor.districtHint')}
        value={fields.zoneId}
        disabled={fields.location !== null}
        options={[
          { value: null, label: t('editor.districtUnset') },
          ...districtIds.map((value) => ({ value, label: labels.district[value] })),
        ]}
        onChange={(value) => set('zoneId', value)}
      />

      <View style={{ gap: Spacing.sm }}>
        {fields.location && pinDistrict ? (
          <Label style={{ fontWeight: '600' }}>
            {t('editor.pinSet', { district: labels.district[pinDistrict] })}
          </Label>
        ) : null}
        <Action
          label={fields.location ? t('editor.changePin') : t('editor.pickOnMap')}
          variant="outlined"
          onPress={() => setMapOpen(true)}
        />
        <Action
          label={t('editor.useLocation')}
          variant="outlined"
          disabled={locating === 'busy'}
          onPress={() => void locateMe()}
        />
        {fields.location ? (
          <Action label={t('editor.removePin')} variant="outlined" onPress={() => setPin(null)} />
        ) : null}
        {status ? <Note accessibilityLiveRegion="polite">{status}</Note> : null}
      </View>

      <TextField
        label={t('editor.place')}
        hint={t('editor.placeHint')}
        value={fields.locationLabel}
        maxLength={200}
        onChangeText={(value) => set('locationLabel', value)}
      />

      {mapOpen ? (
        <MapPicker
          visible
          initial={fields.location}
          onPick={(point) => {
            setPin(point);
            setMapOpen(false);
          }}
          onClose={() => setMapOpen(false)}
        />
      ) : null}
    </View>
  );
}
