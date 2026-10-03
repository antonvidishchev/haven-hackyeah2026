import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/theme/ThemeProvider';

type ScreenProps = {
  children: ReactNode;
  /** Header already handles the top inset when shown; tabs handle the bottom. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: StyleProp<ViewStyle>;
};

/** Scrollable, safe-area aware screen container with the themed background. */
export function Screen({ children, edges = ['left', 'right'], contentStyle }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.screenContent, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.title, { color: colors.text }, style]}
      {...props}
    />
  );
}

export function Label({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.text }, style]} {...props} />;
}

export function Note({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <Text style={[styles.note, { color: colors.textSecondary }, style]} {...props} />;
}

type ActionProps = {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  disabled?: boolean;
  accessibilityHint?: string;
};

export function Action({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  accessibilityHint,
}: ActionProps) {
  const { colors } = useTheme();
  const filled = variant === 'filled';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        filled
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: 'transparent', borderColor: colors.input },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.8 },
      ]}
    >
      <Text style={[styles.actionLabel, { color: filled ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ChoiceProps = {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
};

/** A selectable option row. Group several inside a view with accessibilityRole="radiogroup". */
export function Choice({ label, description, selected, onSelect }: ChoiceProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      onPress={onSelect}
      style={({ pressed }) => [
        styles.choice,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.secondary : colors.backgroundElement,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.radioOuter, { borderColor: selected ? colors.primary : colors.input }]}>
        {selected ? (
          <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
        ) : null}
      </View>
      <View style={styles.flex}>
        <Label>{label}</Label>
        {description ? <Note>{description}</Note> : null}
      </View>
    </Pressable>
  );
}

type ToggleProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function Toggle({ label, description, value, onValueChange }: ToggleProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <Label>{label}</Label>
        {description ? <Note>{description}</Note> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.input, true: colors.primary }}
        thumbColor={colors.backgroundElement}
        ios_backgroundColor={colors.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { padding: Spacing.md, gap: Spacing.md },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  title: { fontSize: FontSize.heading, fontWeight: '600', lineHeight: 34 },
  label: { fontSize: FontSize.body, lineHeight: 22 },
  note: { fontSize: FontSize.note, lineHeight: 18 },
  action: {
    minHeight: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: FontSize.body, fontWeight: '600' },
  choice: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + Spacing.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
