import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Accounts, end to end, against the real API and real email (Mailpit):
 * sign up → confirm → account page → sign out → sign in → forgot/reset
 * password → sign-in link → guest resume moves into the account → delete.
 *
 * Needs the API (proxied at /api) and Mailpit running; skips itself when
 * either is unreachable. The server rate-limits sign-in endpoints per minute,
 * so each run uses only a handful of requests per endpoint.
 */

const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025';
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const EMAIL = `uitest+${stamp}@example.com`;
const NAME = 'Ada Tester';
const PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'staple orbit lantern 42';

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  const methods = await request.get('/api/auth-methods').then((r) => (r.ok() ? r.json() : null)).catch(() => null);
  const mailpit = await request.get(`${MAILPIT}/api/v1/messages?limit=1`).then((r) => r.ok()).catch(() => false);
  test.skip(!methods?.emailPassword || !mailpit, 'Needs the API with email enabled, and Mailpit');
});

type MailSummary = { ID: string; Subject: string; Created: string; To: { Address: string }[] };

/** The link in the newest email to `to` whose subject contains `subject`, sent after `since`. */
async function emailLink(request: APIRequestContext, to: string, subject: string, since: number): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const list = (await (await request.get(`${MAILPIT}/api/v1/messages?limit=50`)).json()) as { messages: MailSummary[] };
    const hit = list.messages.find(
      (m) =>
        m.Subject.includes(subject) &&
        Date.parse(m.Created) >= since - 2000 &&
        m.To.some((t) => t.Address.toLowerCase() === to.toLowerCase()),
    );
    if (hit) {
      const full = (await (await request.get(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as { Text: string };
      const url = full.Text.match(/https?:\/\/\S+/)?.[0];
      if (!url) throw new Error(`No link in "${subject}"`);
      return url;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No "${subject}" email for ${to}`);
}

async function sessionEmail(page: Page): Promise<string | null> {
  const res = await page.request.get('/api/auth/get-session');
  const body = await res.json().catch(() => null);
  return body?.user?.email ?? null;
}

async function signInWithPassword(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

test('sign up, confirm the email, and land signed in', async ({ page, request }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  // Google is offered only when the server can complete it.
  const methods = await (await request.get('/api/auth-methods')).json();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(methods.google ? 1 : 0);

  // Validation happens before anything is sent.
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter your name.')).toBeVisible();

  await page.getByLabel('Name').fill(NAME);
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Use at least 8 characters.')).toBeVisible();

  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');

  const since = Date.now();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/check-email\?.*reason=verify/);
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  await expect(page.getByText(EMAIL)).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend email in/ })).toBeDisabled();
  const link = await emailLink(request, EMAIL, 'Confirm your email', since);

  // Signing in before confirming explains that a new link was sent.
  await page.goto('/signin');
  await signInWithPassword(page, EMAIL, PASSWORD);
  await expect(page.getByText(/confirm your email first/i)).toBeVisible();

  // The sign-up link lands on the sign-in page, which sends the now signed-in user on.
  await page.goto(link);
  await expect(page).toHaveURL(/\/resumes$/);
  expect(await sessionEmail(page)).toBe(EMAIL);

  // Signed in: the sign-in and sign-up pages send you on.
  await page.goto('/signup');
  await expect(page).toHaveURL(/\/resumes$/);
});

test('account page, menu, sign out and sign in again', async ({ page }) => {
  await page.goto('/signin');
  await signInWithPassword(page, EMAIL, PASSWORD);
  await expect(page).toHaveURL(/\/resumes$/);

  await page.goto('/account');
  await expect(page.getByText(EMAIL).first()).toBeVisible();
  await expect(page.getByText('Verified')).toBeVisible();
  await expect(page.getByText(NAME).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change' })).toBeVisible();

  // The account menu on the landing page.
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'My resumes' }).first()).toBeVisible();
  const trigger = page.getByRole('button', { name: `Account: ${NAME}` }).first();
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Account' });
  await expect(menu.getByRole('menuitem')).toHaveText(['My resumes', 'Account', 'Sign out']);
  await expect(menu.getByRole('menuitem', { name: 'My resumes' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Account' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();

  // Sign out from the account page.
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await sessionEmail(page)).toBeNull();

  // Signed out, the account page asks you to sign in and comes back.
  await page.goto('/account');
  await expect(page).toHaveURL(/\/signin\?next=%2Faccount$/);
  await signInWithPassword(page, EMAIL, 'not my password');
  await expect(page.getByText("That email and password don't match", { exact: false })).toBeVisible();
  await signInWithPassword(page, EMAIL, PASSWORD);
  await expect(page).toHaveURL(/\/account$/);
});

test('forgot password, reset it, sign in with the new one', async ({ page, request }) => {
  await page.goto('/reset-password?error=INVALID_TOKEN');
  await expect(page.getByRole('heading', { name: 'This link has expired' })).toBeVisible();

  await page.goto('/signin');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByLabel('Email')).toHaveValue(EMAIL);
  const since = Date.now();
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page).toHaveURL(/\/check-email\?.*reason=reset/);
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  const link = await emailLink(request, EMAIL, 'Reset your Paperplane password', since);
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  await page.getByLabel('New password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page).toHaveURL(/\/signin\?reset=done$/);
  await expect(page.getByText('Your password was changed.')).toBeVisible();

  await signInWithPassword(page, EMAIL, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/resumes$/);
  expect(await sessionEmail(page)).toBe(EMAIL);
});

test('sign in with an emailed link', async ({ page, request }) => {
  await page.goto('/signin');
  await page.getByRole('button', { name: 'Email me a sign-in link instead' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  await page.getByLabel('Email').fill(EMAIL);
  const since = Date.now();
  await page.getByRole('button', { name: 'Email me a sign-in link', exact: true }).click();
  await expect(page).toHaveURL(/\/check-email\?.*reason=link/);
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();

  const link = await emailLink(request, EMAIL, 'Your Paperplane sign-in link', since);
  await page.goto(link);
  await expect(page).toHaveURL(/\/resumes$/);
  expect(await sessionEmail(page)).toBe(EMAIL);

  // The same link a second time explains itself.
  await page.context().clearCookies();
  await page.goto(link);
  await expect(page).toHaveURL(/\/signin\?.*error=/);
  await expect(page.getByText(/expired or was already used/)).toBeVisible();
});

test('the guest resume moves into the account once, on sign-in', async ({ page, request, context }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const resumeData = {
      personalInfo: {
        fullName: 'Guest Writer', email: 'guest@example.com', phone: '', location: 'Lisbon', title: 'Engineer',
        summary: 'Moved from the browser.', linkedin: '', website: '', photo: '',
      },
      experiences: [{ id: 'exp-1', company: 'Acme', position: 'Engineer', startDate: '2020-01', endDate: '', current: true, description: 'Built things.' }],
      education: [], skills: [], projects: [], customFields: [],
    };
    localStorage.setItem('paperplane:resume', JSON.stringify({ v: 1, templateId: 'modern', resumeData }));
  });

  await page.goto('/signin');
  await signInWithPassword(page, EMAIL, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/resumes$/);
  await expect(page.getByText('Your resume was saved to your account')).toBeVisible();

  const list = async () => (await (await page.request.get('/api/resumes')).json()).resumes as { data: { personalInfo: { fullName: string } }; templateId: string }[];
  const moved = (await list()).filter((r) => r.data.personalInfo.fullName === 'Guest Writer');
  expect(moved).toHaveLength(1);
  expect(moved[0].templateId).toBe('modern');

  // The browser copy is gone (or empty), so nothing is moved twice.
  const local = await page.evaluate(() => localStorage.getItem('paperplane:resume'));
  if (local) expect(JSON.parse(local).resumeData.personalInfo.fullName).toBe('');

  // Reloads and a second tab do not upload it again.
  await page.reload();
  const second = await context.newPage();
  await second.goto('/');
  await second.waitForTimeout(1500);
  await page.waitForTimeout(500);
  expect((await list()).filter((r) => r.data.personalInfo.fullName === 'Guest Writer')).toHaveLength(1);
  await second.close();
  void request;
});

test('delete the account and everything in it', async ({ page }) => {
  await page.goto('/signin?next=%2Faccount');
  await signInWithPassword(page, EMAIL, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole('button', { name: 'Delete my account…' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Delete your account?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('the 1 resume saved in it')).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'Delete account' });
  await expect(confirm).toBeDisabled();

  await dialog.getByLabel('Your password').fill('wrong password');
  await dialog.getByLabel('Type DELETE to confirm').fill('delete');
  await confirm.click();
  await expect(dialog.getByText("That password isn't right.")).toBeVisible();

  await dialog.getByLabel('Your password').fill(NEW_PASSWORD);
  await confirm.click();
  await expect(page.getByRole('heading', { name: 'Your account was deleted' })).toBeVisible();
  expect(await sessionEmail(page)).toBeNull();

  await page.goto('/signin');
  await signInWithPassword(page, EMAIL, NEW_PASSWORD);
  await expect(page.getByText("That email and password don't match", { exact: false })).toBeVisible();
});
