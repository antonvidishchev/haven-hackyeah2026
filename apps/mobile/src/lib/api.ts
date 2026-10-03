import { createHavenClient } from '@haven/api-client';

/** Base URL including the `/api/v1` prefix. Set EXPO_PUBLIC_API_BASE_URL for devices. */
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1';

/** Shared API client. Pass `token` per call; the session provider owns the token. */
export const api = createHavenClient({ baseUrl: apiBaseUrl });
