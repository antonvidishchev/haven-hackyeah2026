import { useRouter } from 'expo-router';
import { useState } from 'react';

import { api } from '@/lib/api';
import { useSession } from '@/session/SessionProvider';

/** "Report an incident": creates a private draft on the server and opens it. */
export function useStartReport() {
  const router = useRouter();
  const { token } = useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function start() {
    setBusy(true);
    setFailed(false);
    try {
      const report = await api.reports.create({ token });
      router.push({ pathname: '/report/[id]', params: { id: report.id } });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return { start, busy, failed, ready: token !== null };
}
