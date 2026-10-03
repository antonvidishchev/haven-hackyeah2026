import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:3001/api/v1';

async function login(request: APIRequestContext, username: string, password: string) {
  const response = await request.post(`${API}/auth/login`, { data: { username, password } });
  expect(response.ok()).toBe(true);
  return { authorization: `Bearer ${(await response.json()).token}` };
}

/** Files a low-severity report as a fresh guest; returns its reference. */
async function fileReport(request: APIRequestContext): Promise<string> {
  const { token } = await (await request.post(`${API}/auth/guest`)).json();
  const headers = { authorization: `Bearer ${token}` };
  const draft = await (await request.post(`${API}/reports`, { headers })).json();
  const updated = await request.put(`${API}/reports/${draft.id}`, {
    headers,
    data: {
      expectedRevision: draft.revision,
      fields: {
        category: 'verbal_harassment',
        severity: 'low',
        description: 'Insults shouted from a passing car.',
        zoneId: 'V',
        locationLabel: 'Aleja Pokoju',
      },
    },
  });
  const filed = await request.post(`${API}/reports/${draft.id}/submit`, {
    headers,
    data: { expectedRevision: (await updated.json()).revision },
  });
  expect(filed.ok()).toBe(true);
  return (await filed.json()).reference as string;
}

async function staffPage(browser: Browser, name: string, landing: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: `Sign in as ${name}` }).click();
  await expect(page).toHaveURL(landing);
  return page;
}

test('the admin sees a promotion in the audit log, without its free text', async ({
  browser,
  request,
}) => {
  const reference = await fileReport(request);
  const headers = await login(request, 'operator', 'HavenOperator1!');
  const queue = await (await request.get(`${API}/operator/cases`, { headers })).json();
  const item = queue.items.find((c: { reference: string }) => c.reference === reference);
  const reason = 'Private reason that must stay out of the audit log';
  const promoted = await request.post(`${API}/operator/cases/${item.id}/promote`, {
    headers,
    data: {
      expectedVersion: item.version,
      followedRecommendation: false,
      targetOrganization: 'professional_paid',
      reason,
    },
  });
  expect(promoted.ok()).toBe(true);

  const admin = await staffPage(browser, 'Local Administrator', '/queue');
  await admin.goto('/admin/audit');
  await expect(admin.getByRole('heading', { level: 1, name: 'Audit log' })).toBeVisible();
  const filters = admin.getByRole('form', { name: 'Filter the audit log' });
  await filters.getByLabel('Action').selectOption('case.promoted');
  await filters.getByLabel('Actor').selectOption({ label: 'Local Operator' });
  await filters.getByRole('button', { name: 'Apply filters' }).click();
  await expect(admin).toHaveURL(/action=case\.promoted/);

  const row = admin.getByRole('row').filter({ hasText: `haven_case:${item.id}` });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Local Operator');
  await expect(row).toContainText('case.promoted');
  await expect(row).toContainText('targetOrganization=professional_paid');
  await expect(row).toContainText(`reasonLength=${reason.length}`);
  await expect(admin.getByText(reason)).toHaveCount(0);

  await row.getByRole('link', { name: `haven_case:${item.id}` }).click();
  await expect(admin.getByRole('heading', { level: 1, name: `Case ${reference}` })).toBeVisible();
  await admin.context().close();
});

test('the operator is denied the audit log', async ({ browser, request }) => {
  const operator = await staffPage(browser, 'Local Operator', '/queue');
  await operator.goto('/admin/audit');
  await expect(
    operator.getByRole('heading', { level: 1, name: 'Admin access required' }),
  ).toBeVisible();
  await operator.context().close();

  const headers = await login(request, 'operator', 'HavenOperator1!');
  expect((await request.get(`${API}/admin/audit`, { headers })).status()).toBe(403);
});
