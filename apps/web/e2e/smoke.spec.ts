import { expect, test } from '@playwright/test';

test('the API is healthy', async ({ request }) => {
  const response = await request.get('http://127.0.0.1:3001/api/v1/health/ready');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok', database: 'ok' });
});

const routes: { path: string; heading: string | RegExp }[] = [
  { path: '/', heading: 'Start with what you have' },
  { path: '/login', heading: 'Sign in' },
  { path: '/report/new', heading: 'Report an incident' },
  { path: '/my-reports', heading: 'My reports' },
  { path: '/report/sample', heading: 'Verbal harassment' },
  { path: '/area-reports', heading: 'Area reports' },
  { path: '/settings', heading: 'Account and settings' },
];

// Staff workspaces render their shells; sign-in protects them from Phase 2 on.
const staffRoutes: { path: string; heading: string }[] = [
  { path: '/queue', heading: 'Response queue' },
  { path: '/queue/sample', heading: 'Case' },
  { path: '/vault', heading: 'Evidence vault' },
  { path: '/cases', heading: 'Assigned cases' },
  { path: '/cases/sample', heading: 'Case' },
  { path: '/admin/audit', heading: 'Audit log' },
];

for (const { path, heading } of staffRoutes) {
  test(`${path} renders in the staff shell`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Workspace' }).first()).toBeAttached();
  });
}

for (const { path, heading } of routes) {
  test(`${path} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Haven home' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('the active navigation item is marked', async ({ page }) => {
  await page.goto('/area-reports');
  const nav = page.getByRole('navigation', { name: 'Main' }).first();
  await expect(nav.getByRole('link', { name: 'Area reports' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('the home page shows the 112 notice', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Call 112/ })).toBeVisible();
});

test('switching to Polish persists in a cookie', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Polski' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Zacznij od tego, co masz' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Zacznij od tego, co masz' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'English' }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Start with what you have' }),
  ).toBeVisible();
});

test('the dark theme applies from Settings', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
});
