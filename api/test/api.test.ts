import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { sql } from 'kysely';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { createDatabase } from '../src/db.js';
import { memoryMailer } from '../src/mailer.js';
import { migrate } from '../src/migrate.js';

/**
 * The API end to end: real routes, real Better Auth, a real MySQL database
 * (TEST_DATABASE_URL, default Laragon's paperplane_test, wiped first), and an
 * in-memory mailer so emailed links can be followed like a user would.
 */

const PUBLIC_URL = 'http://localhost:5173';
const config = loadConfig({
  NODE_ENV: 'test',
  PUBLIC_URL,
  AUTH_SECRET: 'test-secret-test-secret-test-secret-0123456789',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'mysql://root@127.0.0.1:3306/paperplane_test',
  SMTP_URL: 'smtp://unused.invalid:25',
  EMAIL_FROM: 'Paperplane <test@paperplane.test>',
  MAX_RESUMES_PER_USER: '3',
});
const { db } = createDatabase(config.databaseUrl);
const mailer = memoryMailer();
const auth = createAuth({ config, db, mailer });
let base = '';
let close: () => Promise<void>;

before(async () => {
  // A clean schema every run.
  await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(db);
  const { rows } = await sql<{ t: string }>`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`.execute(db);
  for (const { t } of rows) await sql`DROP TABLE ${sql.id(t)}`.execute(db);
  await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(db);
  await migrate(auth, db);

  const server = createApp({ config, auth, db }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => new Promise((r) => server.close(() => r()));
});

after(async () => {
  await close?.();
  await db.destroy();
});

// --- a tiny browser: carries cookies and sends the site's Origin -------------

class Client {
  cookies = new Map<string, string>();

  async req(method: string, path: string, body?: unknown, { origin = PUBLIC_URL }: { origin?: string } = {}) {
    const headers: Record<string, string> = { origin };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(base + path.replace(PUBLIC_URL, ''), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i);
      const value = pair.slice(i + 1);
      if (value === '' || /max-age=0/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    return { status: res.status, json, location: res.headers.get('location') };
  }
}

/** The link in the last email sent to `to`. */
function lastLink(to: string): string {
  const mail = [...mailer.sent].reverse().find((m) => m.to === to);
  assert.ok(mail, `no email sent to ${to}`);
  const url = mail.text.match(/https?:\/\/\S+/)?.[0];
  assert.ok(url, 'email has no link');
  return url;
}

let n = 0;
async function signedInUser(): Promise<{ client: Client; email: string; password: string }> {
  const client = new Client();
  const email = `user${++n}-${Date.now()}@example.com`;
  const password = 'correct horse battery';
  const signUp = await client.req('POST', '/api/auth/sign-up/email', { email, password, name: 'Test User' });
  assert.equal(signUp.status, 200, JSON.stringify(signUp.json));
  const verify = await client.req('GET', lastLink(email));
  assert.ok([200, 302].includes(verify.status), `verify status ${verify.status}`);
  return { client, email, password };
}

const resumeData = {
  personalInfo: { fullName: 'Amara Okonkwo', title: 'Engineer', email: 'amara@example.com' },
  experiences: [{ id: 'e1', company: 'Acme', position: 'Lead', startDate: 'Jan 2020', current: true }],
};

// --- tests --------------------------------------------------------------------

describe('sign-in methods', () => {
  it('reports what this server can complete', async () => {
    const res = await new Client().req('GET', '/api/auth-methods');
    assert.deepEqual(res.json, { emailPassword: true, magicLink: true, google: false });
  });
});

describe('accounts', () => {
  it('signs up, confirms the email from the link, and is then signed in', async () => {
    const { client, email } = await signedInUser();
    const session = await client.req('GET', '/api/auth/get-session');
    assert.equal(session.status, 200);
    assert.equal(session.json?.user?.email, email);
    assert.equal(session.json?.user?.emailVerified, true);
  });

  it('will not sign in before the email is confirmed, and sends the link again', async () => {
    const client = new Client();
    const email = `unverified-${Date.now()}@example.com`;
    await client.req('POST', '/api/auth/sign-up/email', { email, password: 'correct horse battery', name: 'U' });
    const before = mailer.sent.filter((m) => m.to === email).length;
    const signIn = await client.req('POST', '/api/auth/sign-in/email', { email, password: 'correct horse battery' });
    assert.equal(signIn.status, 403);
    assert.equal(mailer.sent.filter((m) => m.to === email).length, before + 1);
    assert.equal((await client.req('GET', '/api/resumes')).status, 401);
  });

  it('rejects a wrong password', async () => {
    const { email } = await signedInUser();
    const res = await new Client().req('POST', '/api/auth/sign-in/email', { email, password: 'wrong password!' });
    assert.equal(res.status, 401);
  });

  it('resets a forgotten password from the emailed link', async () => {
    const { email, password } = await signedInUser();
    const client = new Client();
    const ask = await client.req('POST', '/api/auth/request-password-reset', { email, redirectTo: '/reset-password' });
    assert.equal(ask.status, 200, JSON.stringify(ask.json));
    const follow = await client.req('GET', lastLink(email));
    assert.equal(follow.status, 302);
    const token = new URL(follow.location!, PUBLIC_URL).searchParams.get('token');
    assert.ok(token, `no token in ${follow.location}`);

    const reset = await client.req('POST', '/api/auth/reset-password', { token, newPassword: 'a brand new password' });
    assert.equal(reset.status, 200, JSON.stringify(reset.json));
    assert.equal((await new Client().req('POST', '/api/auth/sign-in/email', { email, password })).status, 401);
    assert.equal(
      (await new Client().req('POST', '/api/auth/sign-in/email', { email, password: 'a brand new password' })).status,
      200,
    );
  });

  it('signs in with an emailed link', async () => {
    const { email } = await signedInUser();
    const client = new Client();
    const ask = await client.req('POST', '/api/auth/sign-in/magic-link', { email, callbackURL: '/resumes' });
    assert.equal(ask.status, 200, JSON.stringify(ask.json));
    await client.req('GET', lastLink(email));
    const session = await client.req('GET', '/api/auth/get-session');
    assert.equal(session.json?.user?.email, email);
  });

  it('deletes the account and every resume with it', async () => {
    const { client, password } = await signedInUser();
    const created = await client.req('POST', '/api/resumes', { templateId: 'modern', data: resumeData });
    const id = created.json.resume.id;
    const del = await client.req('POST', '/api/auth/delete-user', { password });
    assert.equal(del.status, 200, JSON.stringify(del.json));
    const left = await db.selectFrom('resume').select('id').where('id', '=', id).execute();
    assert.equal(left.length, 0);
  });
});

describe('rate limits', () => {
  it('never limit the session check, but do limit sign-in attempts', async () => {
    // The suite runs with limits off; this builds the production setup.
    const limited = createAuth({ config: { ...config, rateLimit: true }, db, mailer });
    const server = createApp({ config, auth: limited, db }).listen(0);
    await new Promise((r) => server.once('listening', r));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const sessionStatuses = new Set<number>();
      for (let i = 0; i < 150; i++) {
        sessionStatuses.add((await fetch(`${url}/api/auth/get-session`)).status);
      }
      assert.deepEqual([...sessionStatuses], [200], 'a session check was refused');

      const signIn = () =>
        fetch(`${url}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: PUBLIC_URL },
          body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong password!' }),
        });
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) statuses.push((await signIn()).status);
      assert.ok(statuses.includes(429), `sign-in was never limited: ${statuses.join(',')}`);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

describe('resumes', () => {
  it('needs a signed-in user', async () => {
    assert.equal((await new Client().req('GET', '/api/resumes')).status, 401);
    assert.equal((await new Client().req('POST', '/api/resumes', { templateId: 'modern' })).status, 401);
  });

  it('creates, lists, opens, saves, duplicates and deletes', async () => {
    const { client } = await signedInUser();

    const created = await client.req('POST', '/api/resumes', { templateId: 'modern', data: resumeData });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const r = created.json.resume;
    assert.equal(r.title, "Amara Okonkwo's resume");
    assert.equal(r.version, 1);
    assert.equal(r.data.personalInfo.fullName, 'Amara Okonkwo');
    assert.equal(r.data.personalInfo.phone, '', 'missing fields default to empty');
    assert.equal(r.data.skills.length, 0);

    const list = await client.req('GET', '/api/resumes');
    assert.equal(list.json.resumes.length, 1);
    assert.equal(list.json.limit, 3);

    const saved = await client.req('PATCH', `/api/resumes/${r.id}`, {
      version: 1,
      title: 'Engineering roles',
      templateId: 'ocean',
      data: { ...resumeData, personalInfo: { ...resumeData.personalInfo, title: 'Staff Engineer' } },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.equal(saved.json.resume.version, 2);
    assert.equal(saved.json.resume.templateId, 'ocean');
    assert.equal(saved.json.resume.data.personalInfo.title, 'Staff Engineer');

    const opened = await client.req('GET', `/api/resumes/${r.id}`);
    assert.equal(opened.json.resume.title, 'Engineering roles');

    const copy = await client.req('POST', `/api/resumes/${r.id}/duplicate`);
    assert.equal(copy.status, 201);
    assert.equal(copy.json.resume.title, 'Engineering roles (copy)');
    assert.notEqual(copy.json.resume.id, r.id);

    assert.equal((await client.req('DELETE', `/api/resumes/${r.id}`)).status, 204);
    assert.equal((await client.req('GET', `/api/resumes/${r.id}`)).status, 404);
    assert.equal((await client.req('GET', '/api/resumes')).json.resumes.length, 1);
  });

  it('refuses a save made from an outdated copy, and returns the current one', async () => {
    const { client } = await signedInUser();
    const { resume } = (await client.req('POST', '/api/resumes', { templateId: 'modern', data: resumeData })).json;
    // Device A saves.
    assert.equal((await client.req('PATCH', `/api/resumes/${resume.id}`, { version: 1, title: 'From A' })).status, 200);
    // Device B still holds version 1.
    const stale = await client.req('PATCH', `/api/resumes/${resume.id}`, { version: 1, title: 'From B' });
    assert.equal(stale.status, 409);
    assert.equal(stale.json.resume.title, 'From A');
    assert.equal(stale.json.resume.version, 2);
  });

  it("never shows, changes or deletes another user's resume", async () => {
    const a = await signedInUser();
    const b = await signedInUser();
    const { resume } = (await a.client.req('POST', '/api/resumes', { templateId: 'modern', data: resumeData })).json;

    assert.equal((await b.client.req('GET', `/api/resumes/${resume.id}`)).status, 404);
    assert.equal((await b.client.req('PATCH', `/api/resumes/${resume.id}`, { version: 1, title: 'x' })).status, 404);
    assert.equal((await b.client.req('POST', `/api/resumes/${resume.id}/duplicate`)).status, 404);
    assert.equal((await b.client.req('DELETE', `/api/resumes/${resume.id}`)).status, 404);
    assert.equal((await b.client.req('GET', '/api/resumes')).json.resumes.length, 0);
    assert.equal((await a.client.req('GET', `/api/resumes/${resume.id}`)).json.resume.title, "Amara Okonkwo's resume");
  });

  it('validates what it stores', async () => {
    const { client } = await signedInUser();
    const bad = async (body: unknown) => (await client.req('POST', '/api/resumes', body)).status;
    assert.equal(await bad({ templateId: '../etc' }), 400);
    assert.equal(await bad({}), 400);
    assert.equal(await bad({ templateId: 'modern', data: { personalInfo: { photo: 'http://169.254.169.254/' } } }), 400);
    assert.equal(
      await bad({ templateId: 'modern', data: { experiences: Array.from({ length: 41 }, (_, i) => ({ id: `e${i}` })) } }),
      400,
    );
    assert.equal(await bad({ templateId: 'modern', data: { personalInfo: { summary: 'x'.repeat(6001) } } }), 400);
    const unknown = await client.req('POST', '/api/resumes', {
      templateId: 'modern',
      data: { personalInfo: { fullName: 'A', onload: 'alert(1)' }, extra: 1 },
    });
    assert.equal(unknown.status, 201);
    assert.equal('onload' in unknown.json.resume.data.personalInfo, false);
    assert.equal('extra' in unknown.json.resume.data, false);
  });

  it('keeps each account to its limit', async () => {
    const { client } = await signedInUser();
    for (let i = 0; i < 3; i++) {
      assert.equal((await client.req('POST', '/api/resumes', { templateId: 'modern' })).status, 201);
    }
    const over = await client.req('POST', '/api/resumes', { templateId: 'modern' });
    assert.equal(over.status, 409);
    assert.match(over.json.error, /up to 3 resumes/);
  });

  it('refuses writes that come from another site', async () => {
    const { client } = await signedInUser();
    const res = await client.req('POST', '/api/resumes', { templateId: 'modern' }, { origin: 'https://evil.example' });
    assert.equal(res.status, 403);
  });
});
