import { getRequestConfig } from 'next-intl/server';

import { getLocalePreference } from '@/lib/preferences';

// No locale URL prefixes: the locale comes from the `haven-locale` cookie.
export default getRequestConfig(async () => {
  const locale = await getLocalePreference();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
