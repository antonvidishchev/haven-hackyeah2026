import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// WCAG 2.1 A and AA rules only; best-practice rules are advisory.
async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, label).toEqual([]);
}

async function visit(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function signInAs(page: Page, name: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: `Sign in as ${name}` }).click();
  await page.waitForURL((url) => url.pathname !== '/login');
}

const publicPages = [
  '/start',
  '/login',
  '/area-reports',
  '/area-reports?category=verbal_harassment',
  '/settings',
  '/my-reports',
];

test('public pages pass axe in light and dark themes', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of publicPages) {
      await visit(page, path);
      await expectNoViolations(page, `${path} (${scheme})`);
    }
  }
});

test('the report editor passes axe at every stage, in Polish too', async ({ page }) => {
  await page.goto('/report/new');
  await expect(page).toHaveURL(/\/report\/[a-z0-9]+$/);
  await expectNoViolations(page, 'what');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectNoViolations(page, 'where');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectNoViolations(page, 'evidence');
  await page.getByRole('button', { name: 'Polski' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  await expectNoViolations(page, 'evidence (pl)');
  await page.getByRole('button', { name: 'English' }).first().click();
});

test('the operator workspace passes axe', async ({ page }) => {
  await signInAs(page, 'Local Operator');
  for (const path of ['/queue', '/queue?view=handled', '/vault', '/queue/showreview']) {
    await visit(page, path);
    await expectNoViolations(page, path);
  }
});

test('the official and admin workspaces pass axe', async ({ page }) => {
  await signInAs(page, 'Volunteer Network Official');
  for (const path of ['/cases', '/cases/showinreview']) {
    await visit(page, path);
    await expectNoViolations(page, path);
  }
  await page.context().clearCookies();
  await signInAs(page, 'Local Administrator');
  await visit(page, '/admin/audit');
  await expectNoViolations(page, '/admin/audit');
});

test('the first Tab reaches the skip link, which moves to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('the current page is marked in the main navigation', async ({ page }) => {
  await page.goto('/area-reports');
  const nav = page.getByRole('navigation', { name: 'Main' }).first();
  await expect(nav.getByRole('link', { name: 'Area reports' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
