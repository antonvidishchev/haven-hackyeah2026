import { expect, test, type Browser, type Page } from '@playwright/test';

const API = 'http://127.0.0.1:3001/api/v1';

type Draft = { description: string; district: string; place: string };

/** Files a low-severity verbal-harassment report as a new guest and returns its reference. */
async function fileAsGuest(page: Page, draft: Draft): Promise<string> {
  await page.goto('/report/new');
  await expect(page).toHaveURL(/\/report\/[a-z0-9]+$/);
  await page.getByLabel('Kind of incident').selectOption({ label: 'Verbal harassment' });
  await page.getByLabel('What happened?').fill(draft.description);
  await page.getByLabel('How serious was it?').selectOption({ label: 'Low' });
  await page.getByRole('button', { name: 'Step 2 · Where' }).click();
  await page.getByLabel('District').selectOption({ label: draft.district });
  await page.getByLabel('Describe the place').fill(draft.place);
  await page.getByRole('button', { name: 'Step 3 · Evidence and review' }).click();
  await page.getByRole('button', { name: 'File a report' }).click();
  const reference = page.getByText(/Your reference is HV-\d{4}-\d{6}\./);
  await expect(reference).toBeVisible();
  return /HV-\d{4}-\d{6}/.exec((await reference.textContent()) ?? '')![0];
}

/** A signed-in operator in a separate browser context, so the resident keeps their session. */
async function operatorPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in as Local Operator' }).click();
  await expect(page).toHaveURL('/queue');
  return page;
}

async function openCase(page: Page, reference: string) {
  await page.goto('/queue');
  await page.getByRole('link', { name: reference }).click();
  await expect(page.getByRole('heading', { level: 1, name: `Case ${reference}` })).toBeVisible();
}

const tab = (page: Page, name: string | RegExp) =>
  page.getByRole('navigation', { name: 'Queue views' }).getByRole('link', { name });

test('request information, resident update, then promote', async ({ page, browser }) => {
  const reference = await fileAsGuest(page, {
    description: 'Shouted at on the tram. I have a video of it.',
    district: 'VIII Dębniki',
    place: 'Tram stop at Rondo Grunwaldzkie',
  });

  const operator = await operatorPage(browser);
  await openCase(operator, reference);
  const advisory = operator.getByRole('region', { name: 'Advisory recommendation' });
  await expect(advisory).toContainText('Simulated local recommendation');
  await expect(advisory).toContainText('ask the resident for the evidence they mention');

  // 1. Ask for the video, by following the recommendation with an edited prefill.
  await operator.getByRole('button', { name: 'Follow AI recommendation' }).click();
  const dialog = operator.getByRole('dialog', { name: 'Follow the recommendation?' });
  await dialog.getByLabel('Message').fill('Could you add the video to your report, please?');
  await dialog.getByRole('button', { name: 'Confirm' }).click();
  await expect(operator.getByRole('status')).toHaveText('Message sent to the resident.');
  const history = operator.getByRole('region', { name: 'Decision history' });
  await expect(history).toContainText('Local Operator wrote to the resident');
  await expect(history).toContainText('Followed the AI recommendation');

  await operator.goto('/queue?view=awaiting_resident');
  await expect(tab(operator, /Awaiting resident/)).toHaveAttribute('aria-current', 'page');
  await expect(operator.getByRole('link', { name: reference })).toBeVisible();

  // 2. The resident sees the request (never who sent it) and updates the report.
  await page.reload();
  const messages = page.getByRole('region', { name: 'Messages from Haven' });
  await expect(messages).toContainText('We need a little more information');
  await expect(messages).toContainText('Could you add the video to your report, please?');
  await expect(messages).not.toContainText('Local Operator');
  await messages.getByRole('link', { name: 'Edit details or add evidence' }).click();
  await page.getByRole('button', { name: 'Step 1 · What happened' }).click();
  await page.getByLabel('What happened?').fill('Shouted at on the tram. The video is lost, sorry.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'unsaved' })).toHaveCount(0);

  await operator.goto('/queue');
  await expect(operator.getByRole('link', { name: reference })).toBeVisible();

  // 3. Promote to professional support: the case is handled.
  await openCase(operator, reference);
  await operator.getByLabel('Destination').selectOption({
    label: 'Kraków Community Support Services (fictional)',
  });
  await operator
    .getByLabel('Reason', { exact: true })
    .fill('Repeated harassment; needs professional support.');
  await operator.getByRole('button', { name: 'Send to organisation' }).click();
  await expect(operator.getByRole('status')).toHaveText(
    'Case sent to Kraków Community Support Services (fictional).',
  );
  await expect(history).toContainText('Local Operator sent the case to an organisation');
  await expect(history).toContainText('Differed from the AI recommendation');

  await operator.goto('/queue?view=handled');
  await expect(operator.getByRole('link', { name: reference })).toBeVisible();
  await operator.context().close();
});

// Only this test files into XIII Podgórze, so its public count is stable while it runs.
test('cancelling a case notifies the resident and drops it from area reports', async ({
  page,
  browser,
  request,
}) => {
  const district = 'XIII Podgórze';
  // Three more reports keep the district at or above the privacy threshold after the cancel.
  for (let i = 0; i < 3; i += 1) {
    const { token } = await (await request.post(`${API}/auth/guest`)).json();
    const headers = { authorization: `Bearer ${token}` };
    const draft = await (await request.post(`${API}/reports`, { headers })).json();
    const updated = await request.put(`${API}/reports/${draft.id}`, {
      headers,
      data: {
        expectedRevision: draft.revision,
        fields: {
          category: 'other',
          severity: 'low',
          description: 'Graffiti.',
          zoneId: 'XIII',
          locationLabel: 'Rynek Podgórski',
        },
      },
    });
    expect(updated.ok()).toBe(true);
    const filed = await request.post(`${API}/reports/${draft.id}/submit`, {
      headers,
      data: { expectedRevision: (await updated.json()).revision },
    });
    expect(filed.ok()).toBe(true);
  }
  const reference = await fileAsGuest(page, {
    description: 'Test report, please ignore.',
    district,
    place: 'Rynek Podgórski',
  });

  const countLine = async (viewer: Page) => {
    await viewer.goto('/area-reports');
    const item = viewer
      .getByRole('region', { name: 'Reports by district' })
      .getByText(new RegExp(`^${district} — `));
    return Number(/(\d+) reports/.exec((await item.textContent()) ?? '')?.[1]);
  };

  const operator = await operatorPage(browser);
  const before = await countLine(operator);
  expect(before).toBeGreaterThanOrEqual(4);

  await openCase(operator, reference);
  await operator.getByLabel('Cancellation reason').selectOption({ label: 'Spam' });
  await operator.getByLabel('Internal comment').fill('Self-declared test report.');
  await operator.getByRole('button', { name: 'Cancel case' }).click();
  const confirm = operator.getByRole('dialog', { name: 'Cancel this case?' });
  await confirm.getByRole('button', { name: 'Cancel case' }).click();
  await expect(
    operator.getByText('This case is closed. No further decisions can be made.'),
  ).toBeVisible();
  await expect(operator.getByRole('region', { name: 'Decision history' })).toContainText(
    'Local Operator cancelled the case',
  );

  // The resident gets the neutral notice, not the internal reason.
  await page.reload();
  const messages = page.getByRole('region', { name: 'Messages from Haven' });
  await expect(messages).toContainText('This report is closed');
  await expect(messages).toContainText('Haven’s team has reviewed it and closed it.');
  await expect(messages).not.toContainText('Self-declared test report.');
  await expect(messages).not.toContainText('Spam');

  expect(await countLine(operator)).toBe(before - 1);
  await operator.context().close();
});
