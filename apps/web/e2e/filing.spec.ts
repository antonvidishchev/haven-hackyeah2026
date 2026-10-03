import { expect, test, type Page } from '@playwright/test';

type Draft = {
  category?: string;
  severity?: string;
  weapon?: boolean;
  description?: string;
  district?: string;
  place?: string;
};

/** Starts a guest draft, fills it in and stops on the review stage. */
async function fillDraft(page: Page, draft: Draft) {
  await page.goto('/report/new');
  await expect(page).toHaveURL(/\/report\/[a-z0-9]+$/);
  if (draft.category) {
    await page.getByLabel('Kind of incident').selectOption({ label: draft.category });
  }
  if (draft.description) await page.getByLabel('What happened?').fill(draft.description);
  if (draft.severity) {
    await page.getByLabel('How serious was it?').selectOption({ label: draft.severity });
  }
  if (draft.weapon) await page.getByLabel('There was a weapon or an immediate threat').check();

  await page.getByRole('button', { name: 'Step 2 · Where' }).click();
  if (draft.district) await page.getByLabel('District').selectOption({ label: draft.district });
  if (draft.place) await page.getByLabel('Describe the place').fill(draft.place);
  await page.getByRole('button', { name: 'Step 3 · Evidence and review' }).click();
}

const version = (page: Page) => page.locator('dt:text-is("Version") + dd');

test('a low-severity report goes to the volunteer network', async ({ page }) => {
  await fillDraft(page, {
    category: 'Verbal harassment',
    severity: 'Low',
    description: 'Someone mocked my accent on tram 4.',
    district: 'I Stare Miasto',
    place: 'Tram 4, Rondo Mogilskie stop',
  });
  await page.getByRole('button', { name: 'File a report' }).click();

  const filed = page.getByRole('heading', { name: 'Report filed' });
  await expect(filed).toBeFocused();
  await expect(page.getByText(/Your reference is HV-\d{4}-\d{6}\./)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Verbal harassment' })).toBeVisible();

  const routing = page.getByRole('region', { name: 'Routing (simulated)' });
  await expect(routing).toContainText('Neighborhood Volunteer Network (fictional)');
  await expect(routing).toContainText('Normal');
  await expect(routing).toContainText('Prototype simulation — no services are contacted.');
  await expect(routing).not.toContainText('Automatic dispatch');
  await expect(routing).not.toContainText('call 112');

  await expect(page.getByRole('region', { name: 'Messages from Haven' })).toContainText(
    'No messages yet.',
  );
  await expect(
    page.getByRole('region', { name: 'History' }).getByText('You filed this report.'),
  ).toBeVisible();
});

test('an emergency jumps the queue to the police unit', async ({ page }) => {
  await fillDraft(page, {
    category: 'Threat',
    weapon: true,
    description: 'A man showed a knife and shouted at me.',
    district: 'II Grzegórzki',
    place: 'Near the Galeria Kazimierz entrance',
  });
  await page.getByRole('button', { name: 'File a report' }).click();

  const routing = page.getByRole('region', { name: 'Routing (simulated)' });
  await expect(routing).toContainText('District Police Coordination Unit (fictional)');
  await expect(routing).toContainText('Top priority');
  await expect(routing).toContainText('Automatic dispatch (simulated)');
  await expect(routing).toContainText('Residents in danger should call 112.');
});

test('a report without a district cannot be filed', async ({ page }) => {
  await fillDraft(page, {
    description: 'Hate graffiti on the underpass wall.',
    place: 'Underpass by the main station',
  });
  await expect(page.getByRole('region', { name: 'Required to file' })).toContainText(
    'A districtstill needed',
  );
  await expect(page.getByRole('button', { name: 'File a report' })).toBeDisabled();
  await expect(
    page.getByText('Complete the “Required to file” list to file this report.'),
  ).toBeVisible();
});

test('editing a filed report adds a revision; escalation is recorded', async ({ page }) => {
  await fillDraft(page, {
    category: 'Discrimination',
    severity: 'Medium',
    description: 'Refused service at a kiosk.',
    district: 'V Krowodrza',
    place: 'Kiosk on Królewska street',
  });
  await page.getByRole('button', { name: 'File a report' }).click();
  await expect(page.getByRole('heading', { name: 'Report filed' })).toBeVisible();
  const routing = page.getByRole('region', { name: 'Routing (simulated)' });
  await expect(routing).toContainText('Kraków Community Support Services (fictional)');
  await expect(routing).toContainText('Confirmation required.');
  const filedVersion = Number(await version(page).textContent());

  // Severity, weapon and repeat are locked; other fields save on "Save changes".
  await page.getByRole('button', { name: 'Step 1 · What happened' }).click();
  await expect(page.getByLabel('How serious was it?')).toBeDisabled();
  await expect(page.getByLabel('There was a weapon or an immediate threat')).toBeDisabled();
  await expect(page.getByLabel('This has happened to me before')).toBeDisabled();
  await page.getByLabel('What happened?').fill('Refused service at a kiosk, twice this week.');
  await expect(page.getByRole('status').filter({ hasText: 'unsaved' })).toBeVisible();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(version(page)).toHaveText(String(filedVersion + 1));

  await page.reload();
  await expect(page.getByLabel('What happened?')).toHaveValue(
    'Refused service at a kiosk, twice this week.',
  );

  const escalate = page.getByRole('region', { name: 'Escalate this report' });
  await escalate.getByLabel('Simulated identity verification (demo stand-in)').check();
  await escalate.getByRole('button', { name: 'Escalate this report' }).click();
  await expect(page.getByText('This report has been escalated.')).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'History' }).getByText('You escalated this report.'),
  ).toBeVisible();
});
