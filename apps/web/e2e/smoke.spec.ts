import { expect, test } from '@playwright/test';

test('home loads and the API is healthy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('api-status')).toHaveText('API: healthy');
});
