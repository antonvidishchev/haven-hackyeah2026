import { expect, test } from '@playwright/test';

// The seed files 15 fictional reports in III Prądnik Czerwony and 2 in XVII Wzgórza
// Krzesławickie; no e2e test files into either.
test('an anonymous visitor sees privacy-protected district counts', async ({ page }) => {
  await page.goto('/area-reports');
  await expect(page.getByRole('heading', { level: 1, name: 'Area reports' })).toBeVisible();
  await expect(page.getByText(/safety score/)).toHaveCount(0);

  const list = page.getByRole('region', { name: 'Reports by district' });
  await expect(list.getByRole('listitem')).toHaveCount(18);
  await expect(list.getByText('III Prądnik Czerwony — 15 reports')).toBeVisible();
  await expect(
    list.getByText('XVII Wzgórza Krzesławickie — below privacy threshold'),
  ).toBeVisible();

  // The map draws every district, shaded or muted.
  const map = page.getByLabel('Map of Kraków districts shaded by filed reports');
  await expect(map).toBeVisible();
  await expect(map.locator('path.district-shade, path.district-suppressed')).toHaveCount(18);
  await expect(map.locator('path.district-suppressed').first()).toBeVisible();
});

// Only one of the III Prądnik Czerwony seed reports is verbal harassment.
test('filtering by incident type keeps the privacy threshold', async ({ page }) => {
  await page.goto('/area-reports');
  const filter = page.getByRole('navigation', { name: 'Incident type' });
  await expect(filter.getByRole('link', { name: 'All incident types' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await filter.getByRole('link', { name: 'Verbal harassment' }).click();
  await expect(page).toHaveURL('/area-reports?category=verbal_harassment');
  await expect(filter.getByRole('link', { name: 'Verbal harassment' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const filtered = page.getByRole('region', { name: 'Reports by district: Verbal harassment' });
  await expect(filtered.getByRole('listitem')).toHaveCount(18);
  await expect(filtered.getByText('III Prądnik Czerwony — below privacy threshold')).toBeVisible();

  // The map follows the filter: it mutes exactly the districts the list says are suppressed.
  const map = page.getByLabel('Map of Kraków districts shaded by filed reports');
  const suppressed = await filtered.getByText('below privacy threshold').count();
  await expect(map.locator('path.district-suppressed')).toHaveCount(suppressed);

  await filter.getByRole('link', { name: 'All incident types' }).click();
  await expect(page).toHaveURL('/area-reports');
  await expect(
    page
      .getByRole('region', { name: 'Reports by district' })
      .getByText('III Prądnik Czerwony — 15 reports'),
  ).toBeVisible();
});

test('an unknown incident type shows all types', async ({ page }) => {
  await page.goto('/area-reports?category=bogus');
  await expect(
    page
      .getByRole('navigation', { name: 'Incident type' })
      .getByRole('link', { name: 'All incident types' }),
  ).toHaveAttribute('aria-current', 'page');
});
