import type { NextRequest } from 'next/server';
import { reportIdSchema } from '@haven/shared';

import { apiBaseUrl } from '@/lib/env';
import { getToken } from '@/lib/session';

const passResponseHeaders = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'content-disposition',
];

/** Streams evidence from the API with the viewer's token, passing single Range requests through. */
export async function GET(request: NextRequest, { params }: RouteContext<'/media/[evidenceId]'>) {
  const { evidenceId } = await params;
  if (!reportIdSchema.safeParse(evidenceId).success) return new Response(null, { status: 404 });

  const headers = new Headers();
  const range = request.headers.get('range');
  if (range) headers.set('range', range);
  const token = await getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/evidence/${evidenceId}/media`, {
      headers,
      cache: 'no-store',
      signal: request.signal,
    });
  } catch {
    return new Response(null, { status: 503 });
  }

  const responseHeaders = new Headers({
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  });
  if (!upstream.ok) {
    // Pass 416's Content-Range; hide every other API error body.
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) responseHeaders.set('content-range', contentRange);
    return new Response(null, { status: upstream.status, headers: responseHeaders });
  }
  for (const name of passResponseHeaders) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
