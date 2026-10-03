import { demoAccounts } from '@haven/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Action, Card, Label, Note } from '@/components/ui';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useSession, type SignInError } from '@/session/SessionProvider';
import { useTheme } from '@/theme/ThemeProvider';

// Only resident fixtures: staff accounts cannot sign in on mobile.
const residentDemoAccounts = demoAccounts.filter((account) =>
  ['resident', 'resident2'].includes(account.username),
);

type FieldProps = Omit<TextInputProps, 'style'> & { label: string };

/** Labelled text input; the visible label doubles as the accessible name. */
function Field({ label, ...props }: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Label importantForAccessibility="no">{label}</Label>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            borderColor: colors.input,
            color: colors.text,
            backgroundColor: colors.background,
          },
        ]}
        {...props}
      />
    </View>
  );
}

/** Session summary for the Account tab: guest sign-in or the signed-in resident. */
export function SessionSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { status, principal, signIn, signOut, retry } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<SignInError | 'missing' | null>(null);
  const [busy, setBusy] = useState(false);

  const attempt = async (name: string, secret: string) => {
    if (!name.trim() || !secret) {
      setError('missing');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signIn(name, secret);
    setBusy(false);
    if (result.ok) {
      setUsername('');
      setPassword('');
    } else {
      setError(result.error);
    }
  };

  if (status === 'loading') {
    return (
      <Card>
        <Note accessibilityLiveRegion="polite">{t('session.loading')}</Note>
      </Card>
    );
  }

  if (status === 'offline') {
    return (
      <Card>
        <Label accessibilityLiveRegion="polite">{t('session.offline')}</Label>
        <Action label={t('session.retry')} variant="outlined" onPress={retry} />
      </Card>
    );
  }

  if (principal && principal.role !== 'guest') {
    return (
      <Card>
        <Label>{t('session.signedInAs', { name: principal.name })}</Label>
        <Action label={t('session.signOut')} variant="outlined" onPress={() => void signOut()} />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Label>{t('session.guest')}</Label>
        <Note>{t('session.guestHint')}</Note>
      </Card>

      <Card>
        <Label accessibilityRole="header" style={styles.heading}>
          {t('signIn.title')}
        </Label>
        <Field
          label={t('signIn.username')}
          value={username}
          onChangeText={setUsername}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
        />
        <Field
          label={t('signIn.password')}
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          textContentType="password"
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={() => void attempt(username, password)}
        />
        {error ? (
          <Note
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[styles.error, { color: colors.destructive }]}
          >
            {error === 'missing' ? t('signIn.missing') : t(`signIn.errors.${error}`)}
          </Note>
        ) : null}
        <Action
          label={busy ? t('signIn.submitting') : t('signIn.submit')}
          disabled={busy}
          onPress={() => void attempt(username, password)}
        />
      </Card>

      <Card>
        <Label accessibilityRole="header" style={styles.heading}>
          {t('signIn.demoTitle')}
        </Label>
        <Note>{t('signIn.demoNote')}</Note>
        {residentDemoAccounts.map((account) => (
          <View key={account.username} style={styles.demo}>
            <Note>{account.username}</Note>
            <Action
              label={t('signIn.demoAction', { name: account.name })}
              variant="outlined"
              disabled={busy}
              accessibilityHint={t('signIn.demoHint')}
              onPress={() => void attempt(account.username, account.password)}
            />
          </View>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: '600' },
  field: { gap: Spacing.xs },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + Spacing.xs,
    fontSize: FontSize.body,
  },
  error: { fontWeight: '600' },
  demo: { gap: Spacing.xs },
});
