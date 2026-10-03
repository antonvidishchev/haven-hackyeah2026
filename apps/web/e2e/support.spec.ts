import { expect, test, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:3001/api/v1';

type Fields = Record<string, unknown>;

/** Files a report through the API as the page's own guest, so the page can open it. */
async function fileAsGuest(page: Page, fields: Fields): Promise<{ id: string; reference: string }> {
  await page.goto('/my-reports');
  const guest = (await page.context().cookies()).find((cookie) => cookie.name === 'haven-guest');
  const headers = { authorization: `Bearer ${guest?.value}` };
  const draft = await (await page.request.post(`${API}/reports`, { headers })).json();
  const updated = await page.request.put(`${API}/reports/${draft.id}`, {
    headers,
    data: { expectedRevision: draft.revision, fields },
  });
  expect(updated.ok()).toBe(true);
  const filed = await page.request.post(`${API}/reports/${draft.id}/submit`, {
    headers,
    data: { expectedRevision: (await updated.json()).revision },
  });
  expect(filed.ok()).toBe(true);
  return { id: draft.id as string, reference: (await filed.json()).reference as string };
}

test('a filed report shows matching fictional help, in English and Polish', async ({ page }) => {
  const { id } = await fileAsGuest(page, {
    category: 'verbal_harassment',
    severity: 'low',
    description: 'A man shouted insults at me on the tram to Rondo Mogilskie.',
    zoneId: 'I',
    locationLabel: 'Tram stop Teatr Bagatela',
  });
  await page.goto(`/report/${id}`);

  const section = page.getByRole('region', { name: 'Help that fits your situation' });
  await expect(section).toBeVisible();
  const desk = section.getByRole('listitem', {
    name: 'Old Town Transit Safety Desk (fictional)',
  });
  await expect(desk).toBeVisible();
  await expect(desk.getByText('Victim support')).toBeVisible();
  await expect(
    desk.getByText(/^Matched because: Verbal harassment · I Stare Miasto · “tram”/),
  ).toBeVisible();
  await expect(section.getByText(/Fictional resources for the prototype/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'In danger right now? Call 112.' })).toHaveCount(
    0,
  );

  await page.getByRole('button', { name: 'Polski' }).first().click();
  const sekcja = page.getByRole('region', { name: 'Pomoc dopasowana do Twojej sytuacji' });
  const punkt = sekcja.getByRole('listitem', {
    name: 'Punkt Bezpieczeństwa w Komunikacji – Stare Miasto (fikcyjne)',
  });
  await expect(punkt).toBeVisible();
  await expect(punkt.getByText(/^Dopasowano, bo: .* · I Stare Miasto · „tram”/)).toBeVisible();
  await page.getByRole('button', { name: 'English' }).first().click();
  await expect(section).toBeVisible();
});

test('an emergency pins the 112 notice above the matches', async ({ page }) => {
  const { id } = await fileAsGuest(page, {
    category: 'threat',
    severity: 'emergency',
    weaponOrImmediateThreat: true,
    description: 'Someone threatened me with a knife at night.',
    zoneId: 'I',
    locationLabel: 'Planty near Barbakan',
  });
  await page.goto(`/report/${id}`);
  const section = page.getByRole('region', { name: 'Help that fits your situation' });
  await expect(
    section.getByRole('heading', { name: 'In danger right now? Call 112.' }),
  ).toBeVisible();
  await expect(section.getByRole('listitem').first()).toBeVisible();
});

test('the operator sees the same suggestions on the case', async ({ page, browser }) => {
  const { reference } = await fileAsGuest(page, {
    category: 'verbal_harassment',
    severity: 'low',
    description: 'Shouting on the tram again, near the stop.',
    zoneId: 'I',
    locationLabel: 'Tram stop Plac Wszystkich Świętych',
  });
  const operator = await (await browser.newContext()).newPage();
  await operator.goto('/login');
  await operator.getByRole('button', { name: 'Sign in as Local Operator' }).click();
  await expect(operator).toHaveURL('/queue');
  await operator.getByRole('link', { name: reference }).click();
  const panel = operator.getByRole('region', { name: 'Support suggested to the resident' });
  await expect(panel.getByText('Old Town Transit Safety Desk (fictional)')).toBeVisible();
  await expect(
    panel.getByText(/Verbal harassment · I Stare Miasto · “tram”/).first(),
  ).toBeVisible();
  await operator.context().close();
});
