import {
  apiErrorBodySchema,
  type AuthResponse,
  type EvidenceItem,
  type LoginRequest,
  type ReportDetail,
  type ReportListResponse,
  type SessionResponse,
  type UpdateReportRequest,
} from '@haven/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HavenClientOptions {
  /** Base URL including the `/api/v1` prefix, e.g. `http://127.0.0.1:3001/api/v1`. */
  baseUrl: string;
  /** Returns the bearer token to send, or null for anonymous calls. */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
}

export interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  /** Overrides `getToken` for this call. `null` sends no token. */
  token?: string | null;
  /** Extra request headers, e.g. `x-forwarded-for` when calling on a visitor's behalf. */
  headers?: Record<string, string>;
}

export function createHavenClient(options: HavenClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  // Resolved per call so runtime patches of the global (Next.js, test stubs) apply.
  const doFetch: typeof fetch = (input, init) => (options.fetch ?? fetch)(input, init);

  async function request<T>(method: string, path: string, init: RequestOptions = {}): Promise<T> {
    const token = init.token !== undefined ? init.token : await options.getToken?.();
    const headers: Record<string, string> = { ...init.headers, accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const multipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (init.body !== undefined && !multipart) headers['content-type'] = 'application/json';

    const response = await doFetch(`${baseUrl}${path}`, {
      method,
      headers,
      body:
        init.body === undefined
          ? undefined
          : multipart
            ? (init.body as FormData)
            : JSON.stringify(init.body),
      signal: init.signal,
      cache: 'no-store',
    });

    const text = await response.text();
    const json: unknown = text ? safeJson(text) : undefined;

    if (!response.ok) {
      const parsed = apiErrorBodySchema.safeParse(json);
      if (parsed.success) {
        const { code, message, details } = parsed.data.error;
        throw new ApiError(response.status, code, message, details);
      }
      throw new ApiError(response.status, 'http_error', response.statusText || 'Request failed');
    }
    return json as T;
  }

  return {
    request,
    get: <T>(path: string, init?: RequestOptions) => request<T>('GET', path, init),
    post: <T>(path: string, init?: RequestOptions) => request<T>('POST', path, init),
    auth: {
      login: (body: LoginRequest, init?: Omit<RequestOptions, 'body'>) =>
        request<AuthResponse>('POST', '/auth/login', { ...init, body, token: null }),
      guest: (init?: Omit<RequestOptions, 'body'>) =>
        request<AuthResponse>('POST', '/auth/guest', { ...init, token: null }),
      logout: (init?: Omit<RequestOptions, 'body'>) => request<void>('POST', '/auth/logout', init),
      session: (init?: Omit<RequestOptions, 'body'>) =>
        request<SessionResponse>('GET', '/session', init),
    },
    reports: {
      create: (init?: Omit<RequestOptions, 'body'>) =>
        request<ReportDetail>('POST', '/reports', init),
      list: (
        query: { cursor?: string; limit?: number } = {},
        init?: Omit<RequestOptions, 'body'>,
      ) => request<ReportListResponse>('GET', `/reports${queryString(query)}`, init),
      get: (id: string, init?: Omit<RequestOptions, 'body'>) =>
        request<ReportDetail>('GET', `/reports/${encodeURIComponent(id)}`, init),
      update: (id: string, body: UpdateReportRequest, init?: Omit<RequestOptions, 'body'>) =>
        request<ReportDetail>('PUT', `/reports/${encodeURIComponent(id)}`, { ...init, body }),
    },
    evidence: {
      /** Multipart upload with a single `file` field. */
      upload: (reportId: string, form: FormData, init?: Omit<RequestOptions, 'body'>) =>
        request<EvidenceItem>('POST', `/reports/${encodeURIComponent(reportId)}/evidence`, {
          ...init,
          body: form,
        }),
      remove: (id: string, init?: Omit<RequestOptions, 'body'>) =>
        request<void>('DELETE', `/evidence/${encodeURIComponent(id)}`, init),
      mediaPath: (id: string) => `/evidence/${encodeURIComponent(id)}/media`,
    },
  };
}

export type HavenClient = ReturnType<typeof createHavenClient>;

function queryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
