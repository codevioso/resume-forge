import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before } from 'node:test';
import { sql } from 'kysely';
import { fakeModel } from '../src/ai/model.js';
import { AiService } from '../src/ai/service.js';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { CreditService } from '../src/credits/service.js';
import { createDatabase } from '../src/db.js';
import { memoryMailer } from '../src/mailer.js';
import { migrate } from '../src/migrate.js';

/**
 * The API end to end: real routes, real Better Auth, a real MySQL database
 * (TEST_DATABASE_URL, default Laragon's paperplane_test, wiped first), an
 * in-memory mailer so emailed links can be followed like a user would, and a
 * clock the credits and AI services read, so tests can jump forward in time.
 *
 * Call once at the top of a test file; it registers the before/after hooks.
 */

export const PUBLIC_URL = 'http://localhost:5173';

export function useTestApi(env: Record<string, string> = {}) {
  const clock = { now: null as Date | null };
  const now = () => clock.now ?? new Date();

  const config = loadConfig({
    NODE_ENV: 'test',
    PUBLIC_URL,
    AUTH_SECRET: 'test-secret-test-secret-test-secret-0123456789',
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'mysql://root@127.0.0.1:3306/paperplane_test',
    SMTP_URL: 'smtp://unused.invalid:25',
    EMAIL_FROM: 'Paperplane <test@paperplane.test>',
    MAX_RESUMES_PER_USER: '3',
    AI_ENABLED: 'true',
    ...env,
  });
  const { db } = createDatabase(config.databaseUrl);
  const mailer = memoryMailer();
  const credits = new CreditService({ db, trial: config.trial, now });
  const ai = new AiService({ db, credits, model: fakeModel, limits: config.ai, now });
  const auth = createAuth({ config, db, mailer, onUserVerified: (user) => credits.ensureTrial(user) });

  const ctx = { config, db, mailer, credits, ai, auth, clock, base: '' };
  let close: () => Promise<void> = async () => {};

  before(async () => {
    // A clean schema every run.
    await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(db);
    const { rows } = await sql<{ t: string }>`
      SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`.execute(db);
    for (const { t } of rows) await sql`DROP TABLE ${sql.id(t)}`.execute(db);
    await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(db);
    await migrate(auth, db);

    const server = createApp({ config, auth, db, credits, ai }).listen(0);
    await new Promise((r) => server.once('listening', r));
    ctx.base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => new Promise((r) => server.close(() => r()));
  });

  after(async () => {
    await close();
    await db.destroy();
  });

  /** A tiny browser: carries cookies and sends the site's Origin. */
  class Client {
    cookies = new Map<string, string>();

    async req(method: string, path: string, body?: unknown, { origin = PUBLIC_URL }: { origin?: string } = {}) {
      const headers: Record<string, string> = { origin };
      if (body !== undefined) headers['content-type'] = 'application/json';
      if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
      const res = await fetch(ctx.base + path.replace(PUBLIC_URL, ''), {
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
  /** Signs up with email and password, confirms from the email, and is signed in. */
  async function signedInUser(): Promise<{ client: Client; email: string; password: string; userId: string }> {
    const client = new Client();
    const email = `user${++n}-${Date.now()}@example.com`;
    const password = 'correct horse battery';
    const signUp = await client.req('POST', '/api/auth/sign-up/email', { email, password, name: 'Test User' });
    assert.equal(signUp.status, 200, JSON.stringify(signUp.json));
    const verify = await client.req('GET', lastLink(email));
    assert.ok([200, 302].includes(verify.status), `verify status ${verify.status}`);
    const session = await client.req('GET', '/api/auth/get-session');
    return { client, email, password, userId: session.json.user.id };
  }

  return Object.assign(ctx, { Client, lastLink, signedInUser });
}
