import type { NextRequest } from 'next/server';

import { apiBaseUrl } from '@/lib/env';
import { isProxyAllowed, isSameOrigin } from '@/lib/proxy-routes';
import { getToken } from '@/lib/session';

type Context = RouteContext<'/api/proxy/[...path]'>;

const passRequestHeaders = ['content-type', 'content-length', 'accept'];
const passResponseHeaders = ['content-type'];

/** Forwards a whitelisted browser call to the API with the cookie token attached. */
async function forward(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  if (!isProxyAllowed(request.method, path)) return errorResponse(404, 'not_found', 'Not found');
  if (!isSameOrigin(request.headers, request.url)) {
    return errorResponse(403, 'forbidden', 'Cross-site requests are not allowed');
  }

  const headers = new Headers();
  for (const name of passRequestHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = await getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${apiBaseUrl}/${path.join('/')}`, {
      method: request.method,
      headers,
      // Streamed, so large evidence uploads are never buffered here.
      body: request.body,
      // @ts-expect-error -- `duplex` is required by Node's fetch for streamed bodies.
      duplex: 'half',
      cache: 'no-store',
    });
  } catch {
    return errorResponse(503, 'api_unavailable', 'The service is unavailable');
  }

  const responseHeaders = new Headers({ 'cache-control': 'no-store' });
  for (const name of passResponseHeaders) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

export { forward as DELETE, forward as POST, forward as PUT };
