import { enumLabels } from '@haven/shared';
import { getLocale } from 'next-intl/server';

/** Shared enum wording (categories, districts, statuses…) in the request's locale. */
export async function getEnumLabels() {
  return enumLabels[await getLocale()];
}
