import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:3001/api/v1';

type Fields = Record<string, unknown>;

/** Files a report through the API as a fresh guest and returns its reference. */
async function fileReport(request: APIRequestContext, fields: Fields): Promise<string> {
  const { token } = await (await request.post(`${API}/auth/guest`)).json();
  const headers = { authorization: `Bearer ${token}` };
  const draft = await (await request.post(`${API}/reports`, { headers })).json();
  const updated = await request.put(`${API}/reports/${draft.id}`, {
    headers,
    data: { expectedRevision: draft.revision, fields },
  });
  expect(updated.ok()).toBe(true);
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

test('an emergency reaches the police official only', async ({ browser, request }) => {
  const reference = await fileReport(request, {
    category: 'threat',
    severity: 'emergency',
    weaponOrImmediateThreat: true,
    description: 'Someone is threatening people with a knife.',
    zoneId: 'I',
    locationLabel: 'Planty near Barbakan',
  });

  const police = await staffPage(browser, 'Police Liaison Official', '/cases');
  await expect(police.getByText('Organisation: District Police Coordination Unit (fictional)')).toBeVisible();
  await police.getByRole('link', { name: reference }).click();
  await expect(police.getByRole('heading', { level: 1, name: `Case ${reference}` })).toBeVisible();
  await expect(police.getByText('Residents in danger should call 112.')).toBeVisible();
  await police.context().close();

  const volunteer = await staffPage(browser, 'Volunteer Network Official', '/cases');
  await expect(volunteer.getByRole('link', { name: reference })).toHaveCount(0);
  await volunteer.context().close();
});

test('promoted case is claimed, worked and closed by the support official', async ({
  browser,
  request,
}) => {
  const reference = await fileReport(request, {
    category: 'verbal_harassment',
    severity: 'low',
    description: 'Neighbour keeps shouting insults at me in the stairwell.',
    zoneId: 'II',
    locationLabel: 'Stairwell on ulica Grzegórzecka',
  });

  const operator = await staffPage(browser, 'Local Operator', '/queue');
  await operator.goto('/queue');
  await operator.getByRole('link', { name: reference }).click();
  await operator.getByLabel('Destination').selectOption({
    label: 'Kraków Community Support Services (fictional)',
  });
  await operator.getByLabel('Reason', { exact: true }).fill('Needs professional support.');
  await operator.getByRole('button', { name: 'Send to organisation' }).click();
  await expect(operator.getByRole('status')).toHaveText(
    'Case sent to Kraków Community Support Services (fictional).',
  );
  await operator.context().close();

  const support = await staffPage(browser, 'Support Services Official', '/cases');
  await support.getByRole('link', { name: reference }).click();
  await expect(support.getByRole('heading', { level: 1, name: `Case ${reference}` })).toBeVisible();
  const caseUrl = support.url();

  await support.getByRole('button', { name: 'Claim case' }).click();
  await expect(support.getByRole('status')).toHaveText('Case claimed.');
  await expect(support.getByText('You have claimed this case.')).toBeVisible();

  await support.getByLabel('Action type').selectOption({ label: 'Phone call' });
  await support.getByLabel('Note').fill('Called the resident and agreed a meeting.');
  await support.getByRole('button', { name: 'Record action' }).click();
  await expect(support.getByRole('status')).toHaveText('Action recorded.');
  const recorded = support.getByRole('region', { name: 'Recorded external actions' });
  await expect(recorded).toContainText('Phone call · Support Services Official');
  await expect(recorded).toContainText('Called the resident and agreed a meeting.');

  await support.getByLabel('Closing comment').fill('Resident supported; no further action.');
  await support.getByRole('button', { name: 'Close case' }).click();
  await support
    .getByRole('dialog', { name: 'Close this case?' })
    .getByRole('button', { name: 'Close case' })
    .click();
  await expect(support.getByText('This case is closed.', { exact: false })).toBeVisible();
  await expect(support.getByText('Resident supported; no further action.')).toBeVisible();
  await expect(support.getByRole('button', { name: 'Claim case' })).toHaveCount(0);

  await support.goto('/cases');
  await expect(support.getByRole('link', { name: reference })).toBeVisible();
  await support.context().close();

  // Another organisation cannot open the case, even by its address.
  const volunteer = await staffPage(browser, 'Volunteer Network Official', '/cases');
  const response = await volunteer.goto(caseUrl);
  expect(response?.status()).toBe(404);
  await expect(volunteer.getByRole('heading', { name: `Case ${reference}` })).toHaveCount(0);
  await volunteer.context().close();
});
