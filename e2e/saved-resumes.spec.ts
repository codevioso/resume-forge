import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Saved resumes for signed-in users: create one from the gallery, edit it
 * with autosave, find it again, manage it from My resumes, keep working
 * offline, and settle an edit made on two devices at once.
 *
 * Needs the API (with email sign-up) and Mailpit to read the confirmation
 * email; without them the whole file skips.
 */

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';

test.describe.configure({ mode: 'serial' });

let storageState = '';

async function json(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Sign up through the API and confirm through the email link: the account is signed in on `browser`. */
async function signUp(browser: Browser): Promise<string> {
  const email = `e2e-saved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ email, password: 'Paper-plane-42!', name: 'Priya Raman' }),
  });
  expect(res.ok, `sign-up: HTTP ${res.status}`).toBe(true);

  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const found = await json(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const id = found?.messages?.[0]?.ID;
        if (!id) return false;
        const message = await json(`${MAILPIT}/api/v1/message/${id}`);
        link = message?.Text?.match(/https?:\/\/\S+verify-email\S+/)?.[0];
        return Boolean(link);
      },
      { timeout: 15_000, message: 'confirmation email' },
    )
    .toBe(true);

  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  await page.goto(link!);
  const path = join(mkdtempSync(join(tmpdir(), 'paperplane-e2e-')), 'state.json');
  await context.storageState({ path });
  await context.close();
  return path;
}

test.beforeAll(async ({ browser }) => {
  const methods = await json(`${BASE}/api/auth-methods`);
  const mailpit = await json(`${MAILPIT}/api/v1/messages?limit=1`);
  test.skip(!methods?.emailPassword || !mailpit, 'Needs the API with email sign-up, and Mailpit');
  storageState = await signUp(browser);
});

async function signedInPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE, storageState });
  return context.newPage();
}

const saveStatus = (page: Page) => page.locator('[data-save-status]').first();

/** After an edit: the save starts (a second after typing stops) and lands. */
async function saved(page: Page) {
  await expect(saveStatus(page)).toHaveAttribute('data-save-status', 'saving');
  await expect(saveStatus(page)).toHaveAttribute('data-save-status', 'saved');
  await expect(page.getByText('Saved to your account')).toBeVisible();
}

test('a new resume from the gallery saves as you type and opens again from My resumes', async ({ browser }) => {
  const page = await signedInPage(browser);
  await page.goto('/resumes');
  await expect(page.getByRole('heading', { name: 'Create your first resume' })).toBeVisible();

  await page.getByRole('button', { name: 'New resume' }).first().click();
  await expect(page).toHaveURL(/\/templates\?new=1$/);
  await page.getByRole('heading', { name: 'Ocean Teal', level: 3 }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).first().click();
  await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{36}$/);
  const editorUrl = page.url();

  await page.getByPlaceholder('John Doe').fill('Priya Raman');
  await page.getByPlaceholder('Senior Software Engineer').fill('Data Engineer');
  await saved(page);
  // The resume's name follows the person's until the user picks one.
  await expect(page.locator('[data-resume-title]')).toHaveText("Priya Raman's resume");

  await page.reload();
  await expect(page.getByPlaceholder('Senior Software Engineer')).toHaveValue('Data Engineer');
  await expect(page.getByRole('button', { name: 'Ocean Teal', exact: true })).toBeVisible();

  // Switching the template is saved too.
  await page.getByRole('button', { name: 'Ocean Teal', exact: true }).click();
  await page.getByRole('dialog', { name: 'Choose a template' }).getByRole('button', { name: /Modern Professional/ }).click();
  await saved(page);

  await page.getByRole('button', { name: 'Back to my resumes' }).click();
  await expect(page).toHaveURL(/\/resumes$/);
  const card = page.locator('[data-resume-card]');
  await expect(card).toHaveCount(1);
  await expect(card.getByRole('link', { name: "Priya Raman's resume" })).toBeVisible();
  await expect(card.getByText('Modern Professional')).toBeVisible();
  await expect(page.locator('[data-resume-count]')).toContainText('1 of');

  await card.getByRole('link').click();
  await expect(page).toHaveURL(editorUrl);
  await expect(page.getByRole('button', { name: 'Modern Professional', exact: true })).toBeVisible();
  await page.context().close();
});

test('rename, duplicate and delete from My resumes', async ({ browser }) => {
  const page = await signedInPage(browser);
  await page.goto('/resumes');
  const first = page.locator('[data-resume-card]').first();
  await expect(first).toBeVisible();

  await first.getByRole('button', { name: /More actions/ }).click();
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Data roles');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(first.getByRole('link')).toHaveText('Data roles');

  await first.getByRole('button', { name: /More actions/ }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(page.locator('[data-resume-card]')).toHaveCount(2);
  await expect(page.locator('[data-resume-card]').first().getByRole('link')).toHaveText('Data roles (copy)');

  await page.reload();
  await expect(page.locator('[data-resume-card]')).toHaveCount(2);

  const copy = page.locator('[data-resume-card]').first();
  await copy.getByRole('button', { name: /More actions/ }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('[data-resume-card]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('[data-resume-card]')).toHaveCount(1);
  await expect(page.locator('[data-resume-card]').getByRole('link')).toHaveText('Data roles');
  await page.context().close();
});

test('edits made offline are kept on the device and saved once back online', async ({ browser }) => {
  const page = await signedInPage(browser);
  await page.goto('/resumes');
  await page.locator('[data-resume-card]').first().getByRole('link').click();
  await expect(page.getByPlaceholder('John Doe')).toHaveValue('Priya Raman');

  await page.context().setOffline(true);
  await page.getByPlaceholder('Senior Software Engineer').fill('Written offline');
  await expect(page.getByText('Offline — changes kept on this device')).toBeVisible();

  await page.context().setOffline(false);
  await expect(page.getByText('Saved to your account')).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.getByPlaceholder('Senior Software Engineer')).toHaveValue('Written offline');
  await page.context().close();
});

test('an edit on two devices at once asks which version to keep', async ({ browser }) => {
  const laptop = await signedInPage(browser);
  const phone = await signedInPage(browser);
  await laptop.goto('/resumes');
  await laptop.locator('[data-resume-card]').first().getByRole('link').click();
  await phone.goto(laptop.url());
  await expect(laptop.getByPlaceholder('John Doe')).toHaveValue('Priya Raman');
  await expect(phone.getByPlaceholder('John Doe')).toHaveValue('Priya Raman');

  await laptop.getByPlaceholder('Senior Software Engineer').fill('From the laptop');
  await saved(laptop);

  await phone.getByPlaceholder('Senior Software Engineer').fill('From the phone');
  const dialog = phone.getByRole('alertdialog', { name: 'This resume was changed on another device' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Use the other version' }).click();
  await expect(phone.getByPlaceholder('Senior Software Engineer')).toHaveValue('From the laptop');
  await expect(saveStatus(phone)).toHaveAttribute('data-save-status', 'saved');

  // Now the laptop is behind: its edit conflicts, and it keeps its own.
  await laptop.getByPlaceholder('Senior Software Engineer').fill('Laptop wins');
  await saved(laptop);
  await phone.getByPlaceholder('Senior Software Engineer').fill('Phone again');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep mine' }).click();
  await expect(dialog).toBeHidden();
  await expect(saveStatus(phone)).toHaveAttribute('data-save-status', 'saved');

  await laptop.reload();
  await expect(laptop.getByPlaceholder('Senior Software Engineer')).toHaveValue('Phone again');
  await laptop.context().close();
  await phone.context().close();
});

test('signed in, the guest editor sends you to My resumes', async ({ browser }) => {
  const page = await signedInPage(browser);
  await page.goto('/editor');
  await expect(page).toHaveURL(/\/resumes$/);
  await page.context().close();
});

test('signed out, My resumes asks you to sign in first', async ({ page }) => {
  await page.goto('/resumes');
  await expect(page).toHaveURL(/\/signin\?next=%2Fresumes$/);
});
