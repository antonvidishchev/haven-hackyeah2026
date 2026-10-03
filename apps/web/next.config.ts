import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // The monorepo root, so the standalone output includes workspace packages.
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  poweredByHeader: false,
};

export default nextConfig;
