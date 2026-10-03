import Ionicons from '@expo/vector-icons/Ionicons';
import {
  enumLabels,
  findDistrict,
  KRAKOW_CENTER,
  krakowDistricts,
  type LatLng,
} from '@haven/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';
import MapView, { Polygon, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, Label, Note, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const DELTA = 0.02;

// GeoJSON rings are [lng, lat]; react-native-maps wants { latitude, longitude }. Holes are
// skipped: Kraków's district outlines are only drawn as a guide.
const outlines = krakowDistricts.features.flatMap((feature) =>
  feature.geometry.coordinates.map((polygon, index) => ({
    key: `${feature.properties.id}-${index}`,
    coordinates: polygon[0]!.map(([longitude, latitude]) => ({ latitude, longitude })),
  })),
);

const round = (value: number) => Math.round(value * 1e5) / 1e5;

/**
 * "Pick on map": the resident moves the map under a fixed centre pin, so it works with one
 * finger and with screen readers (the pin's district is read out as the map settles).
 */
export function MapPicker({
  visible,
  initial,
  onPick,
  onClose,
}: {
  visible: boolean;
  initial: LatLng | null;
  onPick: (point: LatLng) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const [center, setCenter] = useState<LatLng>(initial ?? KRAKOW_CENTER);
  const district = findDistrict(center);
  const start = initial ?? KRAKOW_CENTER;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Title>{t('editor.mapTitle')}</Title>
          <Note>{t('editor.mapHint')}</Note>
        </View>
        <View style={styles.flex}>
          <MapView
            accessibilityLabel={t('editor.mapLabel')}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: start.lat,
              longitude: start.lng,
              latitudeDelta: DELTA,
              longitudeDelta: DELTA,
            }}
            onRegionChangeComplete={(region: Region) =>
              setCenter({ lat: round(region.latitude), lng: round(region.longitude) })
            }
          >
            {outlines.map((outline) => (
              <Polygon
                key={outline.key}
                coordinates={outline.coordinates}
                strokeColor={colors.primary}
                strokeWidth={1}
                fillColor="transparent"
              />
            ))}
          </MapView>
          <View pointerEvents="none" style={styles.pin}>
            <Ionicons name="location" size={44} color={colors.destructive} />
          </View>
        </View>
        <View style={styles.footer}>
          <Label accessibilityLiveRegion="polite" style={styles.status}>
            {district
              ? t('editor.pinIn', { district: enumLabels[locale].district[district] })
              : t('editor.pinOutside')}
          </Label>
          <Action label={t('editor.useSpot')} disabled={!district} onPress={() => onPick(center)} />
          <Action label={t('editor.cancel')} variant="outlined" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: Spacing.md, gap: Spacing.xs },
  // The pin's tip sits on the map centre.
  pin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -22,
    marginTop: -44,
  },
  footer: { padding: Spacing.md, gap: Spacing.sm },
  status: { fontWeight: '600' },
});
