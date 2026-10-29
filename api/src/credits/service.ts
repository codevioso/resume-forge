import type { Kysely, Transaction } from 'kysely';
import type { CreditBatchTable, Database } from '../db.js';

/**
 * Credits: what AI actions are paid with (docs/PLAN-2.0.md §4).
 *
 * Every grant is a batch with its own expiry. Spending takes from the batch
 * that expires soonest; the balance is whatever is left in batches that have
 * not expired. Expiry needs no job: an expired batch simply stops counting.
 *
 * Every change to a batch also writes a ledger entry (grant, hold, release),
 * so the history always adds up to the balance.
 *
 * An AI action first *holds* its price. If the action fails, the hold is
 * *released* back to the batches it came from — or, if such a batch expired
 * in the meantime, into a new short-lived refund batch, so a failure never
 * costs the user anything.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** How long credits refunded into an expired batch stay usable. */
const REFUND_DAYS = 7;

export class InsufficientCreditsError extends Error {
  constructor(
    readonly balance: number,
    readonly needed: number,
  ) {
    super(`Not enough credits: ${needed} needed, ${balance} left.`);
  }
}

export type Clock = () => Date;

export type GrantInput = {
  userId: string;
  amount: number;
  days: number;
  source: CreditBatchTable['source'];
  note?: string;
  /** Makes a one-off grant idempotent ("trial:<user>", "payment:<id>"). */
  dedupeKey?: string;
};

export class CreditService {
  readonly trial: { credits: number; days: number };
  private readonly db: Kysely<Database>;
  private readonly now: Clock;

  constructor(opts: { db: Kysely<Database>; trial: { credits: number; days: number }; now?: Clock }) {
    this.db = opts.db;
    this.trial = opts.trial;
    this.now = opts.now ?? (() => new Date());
  }

  /**
   * Adds a batch. With a `dedupeKey`, granting twice is a no-op; returns
   * whether this call created the batch.
   */
  async grant(input: GrantInput, trx?: Transaction<Database>): Promise<boolean> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error('amount must be a positive integer');
    if (!(input.days > 0)) throw new Error('days must be positive');
    const run = async (t: Transaction<Database>) => {
      const now = this.now();
      let inserted;
      try {
        inserted = await t
          .insertInto('credit_batch')
          .values({
            user_id: input.userId,
            source: input.source,
            amount: input.amount,
            remaining: input.amount,
            expires_at: new Date(now.getTime() + input.days * DAY_MS),
            dedupe_key: input.dedupeKey ?? null,
            note: input.note ?? null,
            created_at: now,
          })
          .executeTakeFirstOrThrow();
      } catch (err) {
        // Already granted (same dedupe key). Anything else is a real error —
        // not INSERT IGNORE, which would also swallow a missing user.
        if (input.dedupeKey && (err as { errno?: number }).errno === 1062) return false;
        throw err;
      }
      await t
        .insertInto('credit_entry')
        .values({
          user_id: input.userId,
          batch_id: Number(inserted.insertId),
          kind: 'grant',
          amount: input.amount,
          ai_request_id: null,
          created_at: now,
        })
        .execute();
      return true;
    };
    return trx ? run(trx) : this.db.transaction().execute(run);
  }

  /**
   * The free trial, once per account, and only for a confirmed email (a
   * Google or sign-in-link account is confirmed from the start). Called when
   * an account is created or confirms its email, and again whenever its
   * credits are read, as a safety net. Safe to call any number of times.
   * TRIAL_CREDITS=0 switches the trial off.
   */
  async ensureTrial(user: { id: string; emailVerified: boolean }): Promise<boolean> {
    if (!user.emailVerified || this.trial.credits <= 0) return false;
    return this.grant({
      userId: user.id,
      amount: this.trial.credits,
      days: this.trial.days,
      source: 'trial',
      note: 'Free trial',
      dedupeKey: `trial:${user.id}`,
    });
  }

  async balance(userId: string): Promise<number> {
    const row = await this.db
      .selectFrom('credit_batch')
      .select((eb) => eb.fn.sum<number>('remaining').as('total'))
      .where('user_id', '=', userId)
      .where('expires_at', '>', this.now())
      .executeTakeFirst();
    return Number(row?.total ?? 0);
  }

  /** What the account page shows: balance, live batches, recent history. */
  async summary(userId: string, historyLimit = 30) {
    const now = this.now();
    const batches = await this.db
      .selectFrom('credit_batch')
      .select(['id', 'source', 'amount', 'remaining', 'expires_at', 'note', 'created_at'])
      .where('user_id', '=', userId)
      .where('expires_at', '>', now)
      .where('remaining', '>', 0)
      .orderBy('expires_at')
      .orderBy('id')
      .execute();

    const history = await this.db
      .selectFrom('credit_entry as e')
      .innerJoin('credit_batch as b', 'b.id', 'e.batch_id')
      .leftJoin('ai_request as r', 'r.id', 'e.ai_request_id')
      .select(['e.id', 'e.kind', 'e.amount', 'e.created_at', 'b.source', 'b.note', 'b.expires_at', 'r.action'])
      .where('e.user_id', '=', userId)
      .orderBy('e.created_at', 'desc')
      .orderBy('e.id', 'desc')
      .limit(historyLimit)
      .execute();

    // Expiry writes no ledger entry (a batch past its date simply stops
    // counting), so the history derives it: what each expired batch still
    // held. That amount is final, since nothing spends from an expired batch
    // and refunds into one go to a new batch. Negative ids keep these apart
    // from real entries.
    const expired = await this.db
      .selectFrom('credit_batch')
      .select(['id', 'source', 'remaining', 'expires_at', 'note'])
      .where('user_id', '=', userId)
      .where('expires_at', '<=', now)
      .where('remaining', '>', 0)
      .orderBy('expires_at', 'desc')
      .limit(historyLimit)
      .execute();

    const entries = [
      ...history.map((h) => ({
        id: Number(h.id),
        kind: h.kind,
        amount: h.amount,
        action: h.action ?? null,
        source: h.source,
        note: h.note,
        at: new Date(h.created_at).toISOString(),
        batchExpiresAt: new Date(h.expires_at).toISOString(),
      })),
      ...expired.map((b) => ({
        id: -Number(b.id),
        kind: 'expire' as const,
        amount: -b.remaining,
        action: null,
        source: b.source,
        note: b.note,
        at: new Date(b.expires_at).toISOString(),
        batchExpiresAt: new Date(b.expires_at).toISOString(),
      })),
    ];
    entries.sort((x, y) => y.at.localeCompare(x.at) || y.id - x.id);

    return {
      balance: batches.reduce((sum, b) => sum + b.remaining, 0),
      batches: batches.map((b) => ({
        id: Number(b.id),
        source: b.source,
        amount: b.amount,
        remaining: b.remaining,
        expiresAt: new Date(b.expires_at).toISOString(),
        note: b.note,
      })),
      history: entries.slice(0, historyLimit),
    };
  }

  /**
   * Takes `amount` credits for an AI action, soonest-expiring first, in one
   * transaction that locks the user's live batches. Two actions started at
   * the same moment queue on that lock, so neither can spend credits the
   * other already took.
   */
  async hold(userId: string, amount: number, aiRequestId: number): Promise<void> {
    await this.db.transaction().execute(async (t) => {
      const now = this.now();
      const batches = await t
        .selectFrom('credit_batch')
        .select(['id', 'remaining'])
        .where('user_id', '=', userId)
        .where('remaining', '>', 0)
        .where('expires_at', '>', now)
        .orderBy('expires_at')
        .orderBy('id')
        .forUpdate()
        .execute();
      const available = batches.reduce((sum, b) => sum + b.remaining, 0);
      if (available < amount) throw new InsufficientCreditsError(available, amount);

      let need = amount;
      for (const batch of batches) {
        if (need === 0) break;
        const take = Math.min(batch.remaining, need);
        need -= take;
        await t
          .updateTable('credit_batch')
          .set((eb) => ({ remaining: eb('remaining', '-', take) }))
          .where('id', '=', batch.id)
          .execute();
        await t
          .insertInto('credit_entry')
          .values({
            user_id: userId,
            batch_id: Number(batch.id),
            kind: 'hold',
            amount: -take,
            ai_request_id: aiRequestId,
            created_at: now,
          })
          .execute();
      }
    });
  }

  /**
   * Gives back what an AI action held, when the action failed. Idempotent:
   * releasing twice gives back once.
   */
  async release(userId: string, aiRequestId: number): Promise<void> {
    await this.db.transaction().execute(async (t) => {
      const now = this.now();
      const entries = await t
        .selectFrom('credit_entry')
        .select(['id', 'batch_id', 'kind', 'amount'])
        .where('ai_request_id', '=', aiRequestId)
        .where('user_id', '=', userId)
        .forUpdate()
        .execute();
      if (entries.some((e) => e.kind === 'release')) return;

      for (const hold of entries.filter((e) => e.kind === 'hold')) {
        const back = -hold.amount;
        const batch = await t
          .selectFrom('credit_batch')
          .select(['id', 'expires_at'])
          .where('id', '=', hold.batch_id)
          .forUpdate()
          .executeTakeFirst();
        if (batch && new Date(batch.expires_at) > now) {
          await t
            .updateTable('credit_batch')
            .set((eb) => ({ remaining: eb('remaining', '+', back) }))
            .where('id', '=', batch.id)
            .execute();
          await t
            .insertInto('credit_entry')
            .values({ user_id: userId, batch_id: Number(batch.id), kind: 'release', amount: back, ai_request_id: aiRequestId, created_at: now })
            .execute();
        } else {
          // The batch expired while the action ran: refund into a fresh batch.
          const inserted = await t
            .insertInto('credit_batch')
            .values({
              user_id: userId,
              source: 'refund',
              amount: back,
              remaining: back,
              expires_at: new Date(now.getTime() + REFUND_DAYS * DAY_MS),
              dedupe_key: `refund:${aiRequestId}:${hold.batch_id}`,
              note: 'Refund of a failed AI action',
              created_at: now,
            })
            .executeTakeFirstOrThrow();
          await t
            .insertInto('credit_entry')
            .values({ user_id: userId, batch_id: Number(inserted.insertId), kind: 'release', amount: back, ai_request_id: aiRequestId, created_at: now })
            .execute();
        }
      }
    });
  }

  async packs() {
    const rows = await this.db
      .selectFrom('credit_pack')
      .select(['id', 'credits', 'validity_days', 'price_bdt'])
      .where('active', '=', 1)
      .orderBy('sort')
      .orderBy('id')
      .execute();
    return rows.map((p) => ({ id: p.id, credits: p.credits, validityDays: p.validity_days, priceBdt: p.price_bdt }));
  }
}
