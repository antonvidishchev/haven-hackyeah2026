import { expect, test } from '@playwright/test';

// The seed files three fictional reports in III Prądnik Czerwony; no e2e test files into it,
// or into XVIII Nowa Huta.
test('an anonymous visitor sees privacy-protected district counts', async ({ page }) => {
  await page.goto('/area-reports');
  await expect(page.getByRole('heading', { level: 1, name: 'Area reports' })).toBeVisible();
  await expect(page.getByText('The public map is not a safety score.')).toBeVisible();

  const list = page.getByRole('region', { name: 'Reports by district' });
  await expect(list.getByRole('listitem')).toHaveCount(18);
  await expect(list.getByText('III Prądnik Czerwony — 3 reports')).toBeVisible();
  await expect(list.getByText('XVIII Nowa Huta — below privacy threshold')).toBeVisible();

  // The map draws every district, shaded or muted.
  const map = page.getByLabel('Map of Kraków districts shaded by filed reports');
  await expect(map).toBeVisible();
  await expect(map.locator('path.district-shade, path.district-suppressed')).toHaveCount(18);
  await expect(map.locator('path.district-suppressed').first()).toBeVisible();
});
