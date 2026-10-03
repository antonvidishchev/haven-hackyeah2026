import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, Choice, Label, Note, Title } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/theme/ThemeProvider';

type TextFieldProps = Omit<TextInputProps, 'style'> & { label: string; hint?: string };

/** A labelled text input; the hint is read after the label. */
export function TextField({ label, hint, multiline, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Label importantForAccessibility="no" style={styles.fieldLabel}>
        {label}
      </Label>
      {hint ? <Note importantForAccessibility="no">{hint}</Note> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        multiline={multiline}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          multiline && styles.multiline,
          { borderColor: colors.input, color: colors.text, backgroundColor: colors.background },
        ]}
        {...props}
      />
    </View>
  );
}

type Option<T> = { value: T; label: string };

type SelectFieldProps<T> = {
  label: string;
  hint?: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

/** A labelled value that opens a full-screen list of choices. */
export function SelectField<T extends string | null>({
  label,
  hint,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value)?.label ?? '';

  return (
    <View style={styles.field}>
      <Label importantForAccessibility="no" style={styles.fieldLabel}>
        {label}
      </Label>
      {hint ? <Note importantForAccessibility="no">{hint}</Note> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current}`}
        accessibilityHint={hint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          styles.select,
          { borderColor: colors.input, backgroundColor: colors.background },
          (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
        ]}
      >
        <Label style={styles.flex}>{current}</Label>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
          <View style={styles.sheetHeader}>
            <Title style={styles.flex}>{label}</Title>
            <Action label={t('editor.cancel')} variant="outlined" onPress={() => setOpen(false)} />
          </View>
          <FlatList
            accessibilityRole="radiogroup"
            data={options}
            keyExtractor={(option) => String(option.value)}
            contentContainerStyle={styles.sheetList}
            renderItem={({ item }) => (
              <Choice
                label={item.label}
                selected={item.value === value}
                onSelect={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              />
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/** A message that needs attention; announced when it appears. */
export function Alert({
  children,
  tone = 'destructive',
}: {
  children: string;
  tone?: 'destructive' | 'warning';
}) {
  const { colors } = useTheme();
  return (
    <Label
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{ color: colors[tone], fontWeight: '600' }}
    >
      {children}
    </Label>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: Spacing.xs },
  fieldLabel: { fontWeight: '600' },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + Spacing.xs,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
  },
  multiline: { minHeight: 132, textAlignVertical: 'top' },
  select: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  sheetList: { padding: Spacing.md, gap: Spacing.sm },
});
