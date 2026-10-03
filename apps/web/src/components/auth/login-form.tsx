'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { signIn, type SignInState } from '@/app/actions/auth';
import { Field } from '@/components/haven/field';

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations('login');
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const errorMessage =
    state.error === 'invalid'
      ? t('errorInvalid')
      : state.error === 'tooMany'
        ? t('errorTooMany')
        : state.error === 'unavailable'
          ? t('errorUnavailable')
          : null;

  return (
    <form id="login-form" action={action} className="resident-card flex flex-col gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {errorMessage ? (
        <p
          id="login-error"
          role="alert"
          className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
      <Field id="username" label={t('username')}>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.username}
          aria-invalid={state.error === 'invalid' || undefined}
          aria-describedby={errorMessage ? 'login-error' : undefined}
        />
      </Field>
      <Field id="password" label={t('password')}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error === 'invalid' || undefined}
          aria-describedby={errorMessage ? 'login-error' : undefined}
        />
      </Field>
      <button type="submit" className="resident-button" disabled={pending}>
        {pending ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
