import 'server-only';
import { createHavenClient } from '@haven/api-client';
import { apiBaseUrl } from './env';

/** Anonymous server-side client. */
export const publicApi = createHavenClient({ baseUrl: apiBaseUrl });

export async function isApiHealthy(): Promise<boolean> {
  try {
    await publicApi.get('/health/ready');
    return true;
  } catch {
    return false;
  }
}
