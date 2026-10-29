import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Credits and AI consent in the web app: a new account's 300 free trial
 * credits in the header, the account menu (desktop and phone) and the
 * account page, with their 15-day expiry; giving and withdrawing consent to
 * AI processing; and the credit packs shown as "coming soon".
 *
 * Needs the API (with email sign-up) and Mailpit to read the confirmation
 * email; without them the whole file skips.
 */

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
const DAY_MS = 24 * 60 * 60 * 1000;

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
  const email = `e2e-credits-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ email, password: 'Paper-plane-42!', name: 'Farhana Akter' }),
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
  await page.waitForLoadState('networkidle');
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

async function signedInPage(browser: Browser, options: Parameters<Browser['newContext']>[0] = {}): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE, storageState, ...options });
  return context.newPage();
}

type Credits = { balance: number; batches: { source: string; remaining: number; expiresAt: string }[] };

async function readCredits(page: Page): Promise<Credits> {
  const res = await page.request.get('/api/credits');
  expect(res.ok()).toBe(true);
  return res.json();
}

async function consentGiven(page: Page): Promise<boolean> {
  const res = await page.request.get('/api/ai/consent');
  expect(res.ok()).toBe(true);
  return (await res.json()).consented;
}

/** The app's date formats: "13 Nov" (with the year when it is not this year) and "13 Nov 2026". */
function day(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(date);
}
const fullDay = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

test('a new account has 300 free credits for 15 days: header, menu and account page', async ({ browser }) => {
  const page = await signedInPage(browser);
  await page.goto('/resumes');

  const credits = await readCredits(page);
  expect(credits.balance).toBe(300);
  expect(credits.batches).toHaveLength(1);
  const trial = credits.batches[0];
  expect(trial.source).toBe('trial');
  expect(Math.abs(Date.parse(trial.expiresAt) - Date.now() - 15 * DAY_MS)).toBeLessThan(10 * 60_000);
  const expiry = `300 expire ${day(trial.expiresAt)}`;

  // Desktop header: the balance next to the avatar, its expiry in the label (and the hover card).
  const pill = page.locator('[data-credit-balance]');
  await expect(pill).toHaveText(/^300/);
  await expect(pill).toHaveAccessibleName(`300 credits, ${expiry}`);
  await pill.hover();
  await expect(pill).toContainText(expiry);

  // The menu: a credits row above the usual items, which stay as they were.
  await page.getByRole('button', { name: 'Account: Farhana Akter' }).click();
  const menu = page.getByRole('menu', { name: 'Account' });
  await expect(menu.getByRole('menuitem')).toHaveText(['My resumes', 'Account', 'Sign out']);
  const row = page.locator('[data-credits-row]');
  await expect(row).toContainText('Credits');
  await expect(row).toContainText(expiry);
  await expect(row).toContainText('300');

  // It leads to the account page's credits section.
  await row.click();
  await expect(page).toHaveURL(/\/account#credits$/);
  const section = page.locator('#credits');
  await expect(section.getByRole('heading', { name: 'Credits', exact: true })).toBeVisible();
  await expect(section).toBeInViewport();
  await expect(section.locator('[data-credit-total]')).toHaveText('300');
  await expect(section.locator('[data-credit-expiry]')).toContainText(`${expiry} · in 15 days`);

  const batch = section.locator('[data-credit-batch="trial"]');
  await expect(batch).toContainText('Free trial');
  await expect(batch).toContainText(`Expires ${fullDay(trial.expiresAt)} · in 15 days`);

  await expect(section.locator('[data-credit-price="import"]')).toContainText('Import a resume file');
  await expect(section.locator('[data-credit-price="import"]')).toContainText('100 credits');
  await expect(section.locator('[data-credit-price="bullet"]')).toContainText('Improve a bullet point');
  await expect(section.locator('[data-credit-price="bullet"]')).toContainText('5 credits');

  const history = section.locator('[data-credit-entry]');
  await expect(history).toHaveCount(1);
  await expect(history.first()).toContainText('Free trial');
  await expect(history.first()).toContainText('+300');

  await page.context().close();
});

test('on a phone the balance is a row in the account menu', async ({ browser }) => {
  const { defaultBrowserType: _, ...pixel } = devices['Pixel 7'];
  const page = await signedInPage(browser, pixel);
  await page.goto('/resumes');

  await page.getByRole('button', { name: 'Account: Farhana Akter' }).click();
  const row = page.locator('[data-credits-row]');
  await expect(row).toBeVisible();
  await expect(row).toContainText('300');
  // The app bar has no room for the pill: the menu is where the balance lives.
  await expect(page.locator('[data-credit-balance]')).toHaveCount(0);

  await row.click();
  await expect(page).toHaveURL(/\/account#credits$/);
  await expect(page.locator('#credits [data-credit-total]')).toHaveText('300');
  await expect(page.locator('#credits')).toBeInViewport();
  await page.context().close();
});

test('AI processing: consent is asked for, given and withdrawn on the account page', async ({ browser }) => {
  const page = await signedInPage(browser);
  await page.goto('/account');
  const status = page.locator('[data-ai-consent]');
  await expect(status).toHaveAttribute('data-ai-consent', 'none');
  await expect(status).toHaveText('Off');
  expect(await consentGiven(page)).toBe(false);

  // "Not now" records nothing.
  await page.getByRole('button', { name: 'Allow AI processing' }).click();
  const dialog = page.getByRole('dialog', { name: 'Before you use AI' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Anthropic’s Claude');
  await expect(dialog).toContainText('Uploaded files are read, then discarded — never stored.');
  const policy = dialog.getByRole('link', { name: /How we handle AI processing/ });
  await expect(policy).toHaveAttribute('href', '/privacy#ai');
  await expect(policy).toHaveAttribute('target', '_blank');
  await dialog.getByRole('button', { name: 'Not now' }).click();
  await expect(dialog).toBeHidden();
  await expect(status).toHaveAttribute('data-ai-consent', 'none');
  expect(await consentGiven(page)).toBe(false);

  // Agreeing records it, with the date.
  await page.getByRole('button', { name: 'Allow AI processing' }).click();
  await dialog.getByRole('button', { name: 'Agree and continue' }).click();
  await expect(dialog).toBeHidden();
  await expect(status).toHaveAttribute('data-ai-consent', 'given');
  await expect(status).toHaveText('Allowed');
  await expect(page.getByText(`Allowed on ${fullDay(new Date().toISOString())}.`)).toBeVisible();
  expect(await consentGiven(page)).toBe(true);

  await page.reload();
  await expect(page.locator('[data-ai-consent]')).toHaveAttribute('data-ai-consent', 'given');

  // Withdrawing removes it.
  await page.getByRole('button', { name: 'Withdraw consent' }).click();
  await expect(page.locator('[data-ai-consent]')).toHaveAttribute('data-ai-consent', 'none');
  await expect(page.getByText('Consent withdrawn.')).toBeVisible();
  expect(await consentGiven(page)).toBe(false);
  await page.context().close();
});

test('the credit packs are listed as coming soon', async ({ browser }) => {
  const page = await signedInPage(browser);
  await page.goto('/account#credits');

  const res = await page.request.get('/api/credits/packs');
  const { packs, purchasable } = (await res.json()) as {
    packs: { id: number; credits: number; validityDays: number; priceBdt: number }[];
    purchasable: boolean;
  };
  expect(purchasable).toBe(false);
  expect(packs.length).toBeGreaterThan(0);

  const section = page.locator('#credits');
  await expect(section.getByText('Coming soon', { exact: true }).first()).toBeVisible();
  await expect(section.locator('[data-credit-pack]')).toHaveCount(packs.length);
  for (const pack of packs) {
    const card = section.locator(`[data-credit-pack="${pack.id}"]`);
    await expect(card).toContainText(`${pack.credits.toLocaleString('en-US')} credits`);
    await expect(card).toContainText(`Valid for ${pack.validityDays} days`);
    await expect(card).toContainText(`৳${pack.priceBdt.toLocaleString('en-US')}`);
    const buy = card.getByRole('button', { name: /coming soon/i });
    await expect(buy).toBeDisabled();
  }
  await page.context().close();
});
