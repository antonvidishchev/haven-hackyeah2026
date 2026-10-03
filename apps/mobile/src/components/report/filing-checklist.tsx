import Ionicons from '@expo/vector-icons/Ionicons';
import type { FilingGap } from '@haven/shared';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, Label } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/theme/ThemeProvider';

const items: FilingGap[] = ['district', 'place', 'details'];

/** "Required to file", with each item read as done or still needed. */
export function FilingChecklist({ gaps }: { gaps: FilingGap[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const labels: Record<FilingGap, string> = {
    district: t('editor.gapDistrict'),
    place: t('editor.gapPlace'),
    details: t('editor.gapDetails'),
  };
  return (
    <Card>
      <Label accessibilityRole="header" style={{ fontWeight: '600' }}>
        {t('editor.required')}
      </Label>
      {items.map((gap) => {
        const met = !gaps.includes(gap);
        return (
          <View
            key={gap}
            accessible
            accessibilityLabel={`${labels[gap]}: ${met ? t('editor.met') : t('editor.missing')}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
          >
            <Ionicons
              name={met ? 'checkmark-circle' : 'close-circle-outline'}
              size={20}
              color={met ? colors.success : colors.destructive}
            />
            <Label>{labels[gap]}</Label>
          </View>
        );
      })}
    </Card>
  );
}
