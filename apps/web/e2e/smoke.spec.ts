import { expect, test, type Page } from '@playwright/test';

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

async function signInAs(page: Page, name: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: `Sign in as ${name}` }).click();
}

// One sign-in per role keeps the suite under the API's 20-per-minute login limit.
const roles: { name: string; landing: string; heading: string; visits: [string, string][] }[] = [
  {
    name: 'Local Operator',
    landing: '/queue',
    heading: 'Response queue',
    visits: [
      ['/queue/sample', 'Case'],
      ['/vault', 'Evidence vault'],
    ],
  },
  {
    name: 'Local Administrator',
    landing: '/queue',
    heading: 'Response queue',
    visits: [['/admin/audit', 'Audit log']],
  },
  {
    name: 'Police Liaison Official',
    landing: '/cases',
    heading: 'Assigned cases',
    visits: [['/cases/sample', 'Case']],
  },
  { name: 'Support Services Official', landing: '/cases', heading: 'Assigned cases', visits: [] },
  { name: 'Volunteer Network Official', landing: '/cases', heading: 'Assigned cases', visits: [] },
  { name: 'Second Resident', landing: '/', heading: 'Start with what you have', visits: [] },
];

for (const { name, landing, heading, visits } of roles) {
  test(`${name} lands on ${landing}`, async ({ page }) => {
    await signInAs(page, name);
    await expect(page).toHaveURL(landing);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    for (const [path, pageHeading] of visits) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: pageHeading })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Workspace' }).first()).toBeAttached();
    }
  });
}

test('staff areas send anonymous visitors to sign in and back', async ({ page }) => {
  await page.goto('/vault');
  await expect(page).toHaveURL('/login?next=%2Fvault');
  await page.getByRole('button', { name: 'Sign in as Local Operator' }).click();
  await expect(page).toHaveURL('/vault');
  await expect(page.getByRole('heading', { level: 1, name: 'Evidence vault' })).toBeVisible();
});

test('a wrong password shows an error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('resident');
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Incorrect username or password.')).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('a resident is denied the operator queue, then signs out', async ({ page }) => {
  await signInAs(page, 'Local Resident');
  await expect(page).toHaveURL('/');
  await page.goto('/queue');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Operator access required' }),
  ).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByText('Signed in as Local Resident')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/settings');
  await expect(page.getByText('You are using Haven as a guest.')).toBeVisible();
});

test('a resident page makes the visitor a guest', async ({ page, context }) => {
  await page.goto('/my-reports');
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === 'haven-guest')?.httpOnly).toBe(true);
});

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
