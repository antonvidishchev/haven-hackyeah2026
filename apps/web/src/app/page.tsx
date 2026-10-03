import { isApiHealthy } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const healthy = await isApiHealthy();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-9">
      <h1 className="text-3xl font-semibold tracking-tight">Haven</h1>
      <p data-testid="api-status">API: {healthy ? 'healthy' : 'unavailable'}</p>
    </main>
  );
}
