import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fakeModel, type ModelResult } from '../src/ai/model.js';
import { AiError, AiService } from '../src/ai/service.js';
import { CreditService } from '../src/credits/service.js';
import { useTestApi } from './helpers.js';

/** Credits and the AI pipeline (docs/PLAN-2.0.md §4–5), end to end. */

const api = useTestApi({ AI_RATE_PER_MINUTE: '1000', AI_DAILY_LIMIT: '1000' });
const { db, credits, ai, clock, Client, lastLink, signedInUser } = api;

const DAY = 24 * 60 * 60 * 1000;
const later = (days: number) => new Date(Date.now() + days * DAY);

/** A model call that succeeds with a fixed answer. */
const ok = <T,>(output: T, inputTokens = 1000, outputTokens = 200) => async (): Promise<ModelResult<T>> => ({
  output,
  usage: { inputTokens, outputTokens },
  model: fakeModel.id,
});

async function consentingUser() {
  const user = await signedInUser();
  await user.client.req('POST', '/api/ai/consent');
  return user;
}

const entries = (userId: string) =>
  db.selectFrom('credit_entry').select(['kind', 'amount', 'batch_id']).where('user_id', '=', userId).orderBy('id').execute();

describe('free trial', () => {
  it('300 credits for 15 days, once the email is confirmed — not before', async () => {
    const client = new Client();
    const email = `trial-${Date.now()}@example.com`;
    await client.req('POST', '/api/auth/sign-up/email', { email, password: 'correct horse battery', name: 'T' });
    const unconfirmed = await db.selectFrom('user').select('id').where('email', '=', email).executeTakeFirstOrThrow();
    assert.equal(await credits.balance(unconfirmed.id), 0, 'no credits before the email is confirmed');

    await client.req('GET', lastLink(email));
    const res = await client.req('GET', '/api/credits');
    assert.equal(res.status, 200);
    assert.equal(res.json.balance, 300);
    assert.equal(res.json.batches.length, 1);
    assert.equal(res.json.batches[0].source, 'trial');
    const days = (new Date(res.json.batches[0].expiresAt).getTime() - Date.now()) / DAY;
    assert.ok(days > 14.9 && days <= 15, `trial lasts ${days} days`);
    assert.deepEqual(res.json.trial, { credits: 300, days: 15 });
    assert.deepEqual(res.json.prices, { import: 100, projects: 50, tailor: 40, summary: 10, bullet: 5 });
  });

  it('is granted only once, however often it is asked for', async () => {
    const { client, userId } = await signedInUser();
    assert.equal(await credits.ensureTrial({ id: userId, emailVerified: true }), false);
    await client.req('GET', '/api/credits');
    await client.req('GET', '/api/credits');
    assert.equal(await credits.balance(userId), 300);
    assert.equal((await entries(userId)).filter((e) => e.kind === 'grant').length, 1);
  });

  it('also comes with an account created by an emailed sign-in link', async () => {
    const client = new Client();
    const email = `link-${Date.now()}@example.com`;
    await client.req('POST', '/api/auth/sign-in/magic-link', { email, callbackURL: '/resumes' });
    await client.req('GET', lastLink(email));
    assert.equal((await client.req('GET', '/api/credits')).json.balance, 300);
  });

  it('can be switched off with TRIAL_CREDITS=0', async () => {
    const { client, userId } = await signedInUser();
    const noTrial = new CreditService({ db, trial: { credits: 0, days: 15 } });
    assert.equal(await noTrial.ensureTrial({ id: `${userId}-other`, emailVerified: true }), false);
    assert.equal((await client.req('GET', '/api/credits')).status, 200);
  });

  it('needs a signed-in user', async () => {
    assert.equal((await new Client().req('GET', '/api/credits')).status, 401);
    assert.equal((await new Client().req('POST', '/api/ai/consent')).status, 401);
  });
});

describe('batches', () => {
  it('stop counting once they expire', async () => {
    const { client } = await signedInUser();
    try {
      clock.now = later(16);
      const res = await client.req('GET', '/api/credits');
      assert.equal(res.json.balance, 0);
      assert.equal(res.json.batches.length, 0);
      // The history explains where they went.
      assert.deepEqual(
        res.json.history.map((h: { kind: string; amount: number; source: string }) => [h.kind, h.amount, h.source]),
        [
          ['expire', -300, 'trial'],
          ['grant', 300, 'trial'],
        ],
      );
    } finally {
      clock.now = null;
    }
  });

  it('are spent soonest-expiring first', async () => {
    const { userId } = await consentingUser();
    await credits.grant({ userId, amount: 100, days: 5, source: 'grant' });
    await ai.run(userId, 'import', ok('x'));
    await ai.run(userId, 'projects', ok('x'));
    const batches = await db
      .selectFrom('credit_batch')
      .select(['source', 'remaining'])
      .where('user_id', '=', userId)
      .orderBy('expires_at')
      .execute();
    assert.deepEqual(batches, [
      { source: 'grant', remaining: 0 },
      { source: 'trial', remaining: 250 },
    ]);
  });

  it('never let simultaneous actions spend the same credits', async () => {
    const { userId } = await consentingUser();
    // 300 credits, ten 50-credit actions at once: exactly six can be paid for.
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => ai.run(userId, 'projects', ok('x'))));
    const paid = results.filter((r) => r.status === 'fulfilled').length;
    const refused = results.filter(
      (r) => r.status === 'rejected' && r.reason instanceof AiError && r.reason.status === 402,
    ).length;
    assert.equal(paid, 6);
    assert.equal(refused, 4);
    assert.equal(await credits.balance(userId), 0);
  });
});

describe('AI actions', () => {
  it('charge the action price and record what it cost us', async () => {
    const { userId } = await consentingUser();
    const result = await ai.run(userId, 'summary', ok({ summary: 'Hello' }, 1000, 200));
    assert.deepEqual(result, { output: { summary: 'Hello' }, credits: 10, balance: 290 });
    const request = await db.selectFrom('ai_request').selectAll().where('user_id', '=', userId).executeTakeFirstOrThrow();
    assert.equal(request.status, 'succeeded');
    assert.equal(request.input_tokens, 1000);
    assert.equal(request.output_tokens, 200);
    // Haiku 5.5 prices: 1000 × $0.10/M + 200 × $0.50/M = $0.0002
    assert.equal(request.cost_micro_usd, 200);
  });

  it('give the credits back when the AI fails', async () => {
    const { client, userId } = await consentingUser();
    await assert.rejects(
      ai.run(userId, 'import', async () => {
        throw new Error('model timed out');
      }),
      (err: unknown) => err instanceof AiError && err.status === 502 && err.code === 'ai_failed',
    );
    assert.equal(await credits.balance(userId), 300);
    assert.deepEqual(
      (await entries(userId)).map((e) => [e.kind, e.amount]),
      [
        ['grant', 300],
        ['hold', -100],
        ['release', 100],
      ],
    );
    const history = (await client.req('GET', '/api/credits')).json.history;
    assert.equal(history[0].kind, 'release');
    assert.equal(history[0].action, 'import');
  });

  it('refund into a fresh batch if the original expired during the action', async () => {
    const { userId } = await consentingUser();
    try {
      await assert.rejects(
        ai.run(userId, 'tailor', async () => {
          clock.now = later(16); // the trial expires while the model is working
          throw new Error('failed');
        }),
      );
      assert.equal(await credits.balance(userId), 40, 'the 40 credits are back, in a new batch');
      const refund = await db
        .selectFrom('credit_batch')
        .selectAll()
        .where('user_id', '=', userId)
        .where('source', '=', 'refund')
        .executeTakeFirstOrThrow();
      assert.equal(refund.remaining, 40);
    } finally {
      clock.now = null;
    }
  });

  it('refuse an action the balance cannot pay for, and take nothing', async () => {
    const { userId } = await consentingUser();
    await ai.run(userId, 'import', ok('x'));
    await ai.run(userId, 'import', ok('x'));
    await ai.run(userId, 'import', ok('x'));
    await assert.rejects(ai.run(userId, 'bullet', ok('x')), (err: unknown) => {
      assert.ok(err instanceof AiError);
      assert.equal(err.status, 402);
      assert.deepEqual(err.details, { balance: 0, needed: 5 });
      return true;
    });
    const last = await db.selectFrom('ai_request').select('status').where('user_id', '=', userId).orderBy('id', 'desc').executeTakeFirstOrThrow();
    assert.equal(last.status, 'rejected');
  });

  it('need consent first, which can be withdrawn', async () => {
    const { client, userId } = await signedInUser();
    await assert.rejects(ai.run(userId, 'bullet', ok('x')), (err: unknown) => err instanceof AiError && err.status === 403);
    assert.equal((await client.req('GET', '/api/ai/consent')).json.consented, false);

    const given = await client.req('POST', '/api/ai/consent');
    assert.equal(given.json.consented, true);
    assert.ok(given.json.at);
    await ai.run(userId, 'bullet', ok('x'));

    await client.req('DELETE', '/api/ai/consent');
    await assert.rejects(ai.run(userId, 'bullet', ok('x')), (err: unknown) => err instanceof AiError && err.status === 403);
  });

  it('respect the daily limit, counting only actions that ran', async () => {
    const { userId } = await consentingUser();
    const limited = new AiService({ db, credits, model: fakeModel, limits: { enabled: true, perMinute: 100, perDay: 2 } });
    await limited.run(userId, 'bullet', ok('x'));
    await limited.run(userId, 'bullet', ok('x'));
    await assert.rejects(
      limited.run(userId, 'bullet', ok('x')),
      (err: unknown) => err instanceof AiError && err.status === 429 && err.code === 'daily_limit',
    );
  });

  it('are unavailable while AI is switched off', async () => {
    const { userId } = await consentingUser();
    const off = new AiService({ db, credits, model: fakeModel, limits: { enabled: false, perMinute: 10, perDay: 10 } });
    await assert.rejects(off.run(userId, 'bullet', ok('x')), (err: unknown) => err instanceof AiError && err.status === 503);
    assert.equal(await credits.balance(userId), 300);
  });
});

describe('packs and accounts', () => {
  it('lists the packs on sale, not yet purchasable', async () => {
    const { client } = await signedInUser();
    const res = await client.req('GET', '/api/credits/packs');
    assert.equal(res.json.purchasable, false);
    assert.deepEqual(
      res.json.packs.map((p: { credits: number; validityDays: number; priceBdt: number }) => [p.credits, p.validityDays, p.priceBdt]),
      [
        [1000, 30, 50],
        [1000, 90, 70],
        [1000, 180, 80],
      ],
    );
  });

  it('deleting an account deletes its credits and AI history', async () => {
    const { client, password, userId } = await consentingUser();
    await ai.run(userId, 'bullet', ok('x'));
    assert.equal((await client.req('POST', '/api/auth/delete-user', { password })).status, 200);
    for (const table of ['credit_batch', 'credit_entry', 'ai_request', 'ai_consent'] as const) {
      const left = await db.selectFrom(table).select('user_id').where('user_id', '=', userId).execute();
      assert.equal(left.length, 0, `${table} still has rows`);
    }
  });
});
