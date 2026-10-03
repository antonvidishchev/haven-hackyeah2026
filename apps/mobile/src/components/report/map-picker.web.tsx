import type { LatLng } from '@haven/shared';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';

import { Action, Label, Title } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/theme/ThemeProvider';

/** react-native-maps has no web build; the web preview asks for a district instead. */
export function MapPicker({
  visible,
  onClose,
}: {
  visible: boolean;
  initial: LatLng | null;
  onPick: (point: LatLng) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.body, { backgroundColor: colors.background }]}>
        <Title>{t('editor.mapTitle')}</Title>
        <Label>{t('editor.mapUnavailable')}</Label>
        <Action label={t('editor.cancel')} variant="outlined" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: Spacing.md, gap: Spacing.md },
});
