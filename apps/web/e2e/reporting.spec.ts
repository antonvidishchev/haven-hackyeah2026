import { expect, test, type Browser, type Page } from '@playwright/test';

// A 1×1 PNG.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function startDraft(page: Page): Promise<string> {
  await page.goto('/report/new');
  await expect(page).toHaveURL(/\/report\/[a-z0-9]+$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Your private draft' })).toBeVisible();
  return page.url();
}

async function signInAs(browser: Browser, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByRole('button', { name: `Sign in as ${name}` }).click();
  await expect(page).toHaveURL('/');
  return page;
}

test('a guest draft autosaves and survives a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startDraft(page);

  await page.getByLabel('Kind of incident').selectOption({ label: 'Verbal harassment' });
  await page.getByLabel('What happened?').fill('Shouted at on the tram because of my accent.');
  await page.getByLabel('There was a weapon or an immediate threat').check();
  await expect(page.getByLabel('How serious was it?')).toHaveValue('emergency');
  await expect(page.getByRole('status')).toContainText('Saved at');

  await page.reload();
  await expect(page.getByLabel('What happened?')).toHaveValue(
    'Shouted at on the tram because of my accent.',
  );
  await expect(page.getByLabel('Kind of incident')).toHaveValue('verbal_harassment');
  await expect(page.getByLabel('There was a weapon or an immediate threat')).toBeChecked();
  const history = page.getByRole('region', { name: 'History' });
  await expect(history.getByText('You edited the report.')).toBeVisible();
  await expect(history.getByText('You started this draft.')).toBeVisible();

  await page.goto('/my-reports');
  await expect(page.getByText('tied to this browser')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Verbal harassment' }).first()).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Continue your draft' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a map pin sets the district', async ({ page }) => {
  await startDraft(page);
  await page.getByRole('button', { name: 'Step 2 · Where' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Where' })).toBeFocused();
  const checklist = page.getByRole('region', { name: 'Required to file' });
  await expect(checklist).toContainText('A districtstill needed');

  // Escape cancels and returns focus to the opener.
  await page.getByRole('button', { name: 'Pick on map' }).click();
  const dialog = page.getByRole('dialog', { name: 'Pick the place on the map' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pick on map' })).toBeFocused();

  // The map opens on the Main Market Square, in district I.
  await page.getByRole('button', { name: 'Pick on map' }).click();
  await expect(dialog.getByText('Pin is in I Stare Miasto')).toBeVisible();
  await dialog.getByRole('button', { name: 'Use this spot' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Pin set in I Stare Miasto.')).toBeVisible();
  await expect(page.getByLabel('District')).toHaveValue('I');
  await expect(page.getByLabel('District')).toBeDisabled();
  await expect(checklist).toContainText('A districtdone');
  await expect(checklist).toContainText('A pin or a place descriptiondone');
  await expect(page.getByRole('status')).toContainText('Saved at');

  await page.reload();
  await page.getByRole('button', { name: 'Step 2 · Where' }).click();
  await expect(page.getByLabel('District')).toHaveValue('I');
  await page.getByRole('button', { name: 'Remove pin' }).click();
  await expect(page.getByLabel('District')).toBeEnabled();
});

test('evidence uploads, previews and stays after a reload', async ({ page }) => {
  await startDraft(page);
  await page.getByRole('button', { name: 'Step 3 · Evidence and review' }).click();
  await expect(page.getByRole('heading', { name: 'Private custody' })).toBeVisible();
  await page
    .getByLabel('Add photos, video or audio')
    .setInputFiles({ name: 'tram-stop.png', mimeType: 'image/png', buffer: png });
  const image = page.getByRole('img', { name: 'Photo: tram-stop.png' });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1);

  // Refused before upload.
  await page
    .getByLabel('Add photos, video or audio')
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByText('This kind of file isn’t supported.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Step 3 · Evidence and review' }).click();
  await expect(page.getByRole('img', { name: 'Photo: tram-stop.png' })).toBeVisible();
  await expect(page.getByText('A description or evidencedone')).toBeVisible();
});

test('another resident cannot open a report or its evidence', async ({ browser }) => {
  const owner = await signInAs(browser, 'Local Resident');
  const url = await startDraft(owner);
  await owner.getByRole('button', { name: 'Step 3 · Evidence and review' }).click();
  await owner
    .getByLabel('Add photos, video or audio')
    .setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: png });
  const src = await owner.getByRole('img', { name: 'Photo: proof.png' }).getAttribute('src');
  expect(src).toMatch(/^\/media\/[a-z0-9]+$/);
  expect((await owner.request.get(src!)).status()).toBe(200);

  const other = await signInAs(browser, 'Second Resident');
  await other.goto(url);
  await expect(other.getByText("We couldn't find that page.")).toBeVisible();
  expect((await other.request.get(src!)).status()).toBe(404);
});
