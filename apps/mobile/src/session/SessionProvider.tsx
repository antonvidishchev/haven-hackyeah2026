import { ApiError } from '@haven/api-client';
import type { AuthResponse, SessionPrincipal } from '@haven/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { api } from '@/lib/api';
import { readPreference, removePreference, writePreference } from '@/lib/preferences';

const SESSION_KEY = 'haven.session';

export type SessionStatus = 'loading' | 'ready' | 'offline';

/** Translation keys under `signIn.errors`. */
export type SignInError = 'invalidCredentials' | 'rateLimited' | 'staffUseWeb' | 'unreachable';

export type SignInResult = { ok: true } | { ok: false; error: SignInError };

type SessionContextValue = {
  status: SessionStatus;
  principal: SessionPrincipal | null;
  token: string | null;
  signIn: (username: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  /** Re-runs the launch sequence, e.g. after the device comes back online. */
  retry: () => void;
};

type SessionState = Pick<SessionContextValue, 'status' | 'principal' | 'token'>;

const SessionContext = createContext<SessionContextValue | null>(null);

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

/** Asks the API for a fresh guest session and persists its token. */
async function createGuest(): Promise<AuthResponse> {
  const guest = await api.auth.guest();
  await writePreference(SESSION_KEY, guest.token);
  return guest;
}

/** Maps a login failure to a calm, translatable reason. */
export function mapSignInError(error: unknown): SignInError {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'invalidCredentials';
    if (error.status === 429) return 'rateLimited';
  }
  return 'unreachable';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    principal: null,
    token: null,
  });
  // Shared across StrictMode double-effects so first launch creates only one guest.
  const launch = useRef<Promise<SessionState> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    launch.current ??= restoreSession();
    void launch.current.then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    launch.current = null;
    setState((current) => ({ ...current, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    let auth: AuthResponse;
    try {
      auth = await api.auth.login({ username: username.trim(), password });
    } catch (error) {
      return { ok: false, error: mapSignInError(error) } as const;
    }
    // Mobile is for residents (and guests); staff work in the web workspace.
    if (auth.principal.role !== 'resident') {
      await api.auth.logout({ token: auth.token }).catch(() => undefined);
      return { ok: false, error: 'staffUseWeb' } as const;
    }
    await writePreference(SESSION_KEY, auth.token);
    setState({ status: 'ready', principal: auth.principal, token: auth.token });
    return { ok: true } as const;
  }, []);

  const signOut = useCallback(async () => {
    const previous = state.token;
    setState({ status: 'loading', principal: null, token: null });
    if (previous) await api.auth.logout({ token: previous }).catch(() => undefined);
    await removePreference(SESSION_KEY);
    try {
      const guest = await createGuest();
      setState({ status: 'ready', principal: guest.principal, token: guest.token });
    } catch {
      setState({ status: 'offline', principal: null, token: null });
    }
  }, [state.token]);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, retry }),
    [state, signIn, signOut, retry],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Launch sequence: validate the stored token, otherwise start a guest session.
 * A network failure keeps the stored token on the device and reports 'offline'.
 */
async function restoreSession(): Promise<SessionState> {
  const stored = await readPreference(SESSION_KEY);
  try {
    if (stored) {
      try {
        const { principal } = await api.auth.session({ token: stored });
        return { status: 'ready', principal, token: stored };
      } catch (error) {
        if (!isUnauthorized(error)) throw error;
        await removePreference(SESSION_KEY);
      }
    }
    const guest = await createGuest();
    return { status: 'ready', principal: guest.principal, token: guest.token };
  } catch {
    return { status: 'offline', principal: null, token: null };
  }
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
