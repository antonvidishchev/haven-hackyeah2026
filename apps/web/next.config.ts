import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  // The monorepo root, so the standalone output includes workspace packages.
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
