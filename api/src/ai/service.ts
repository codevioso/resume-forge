import type { Kysely } from 'kysely';
import type { Database } from '../db.js';
import { CreditService, InsufficientCreditsError, type Clock } from '../credits/service.js';
import { AI_ACTIONS, type AiAction } from './actions.js';
import { costMicroUsd, type AiModel, type ModelResult } from './model.js';

/**
 * The one path every AI action takes (docs/PLAN-2.0.md §5):
 *
 *   enabled? → consent? → rate limits → hold the price → run the model
 *     → success: record usage, the credits stay spent
 *     → failure: release the hold (refund), record the error
 *
 * The caller supplies only `run`, which turns the input into a model call and
 * validates the output. It never sees credits, and the resume itself is never
 * changed here — actions return suggestions.
 */

export class AiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type AiLimits = { enabled: boolean; perMinute: number; perDay: number };

export class AiService {
  private readonly recent = new Map<string, number[]>();

  constructor(
    private readonly opts: {
      db: Kysely<Database>;
      credits: CreditService;
      model: AiModel;
      limits: AiLimits;
      now?: Clock;
    },
  ) {}

  private get now() {
    return (this.opts.now ?? (() => new Date()))();
  }

  async hasConsent(userId: string): Promise<boolean> {
    const row = await this.opts.db.selectFrom('ai_consent').select('user_id').where('user_id', '=', userId).executeTakeFirst();
    return Boolean(row);
  }

  async consentedAt(userId: string): Promise<Date | null> {
    const row = await this.opts.db
      .selectFrom('ai_consent')
      .select('consented_at')
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return row ? new Date(row.consented_at) : null;
  }

  async giveConsent(userId: string): Promise<void> {
    await this.opts.db
      .insertInto('ai_consent')
      .values({ user_id: userId, consented_at: this.now })
      .onDuplicateKeyUpdate({ consented_at: this.now })
      .execute();
  }

  async withdrawConsent(userId: string): Promise<void> {
    await this.opts.db.deleteFrom('ai_consent').where('user_id', '=', userId).execute();
  }

  /** Per-user sliding minute, kept in memory (one API process). */
  private takeMinuteSlot(userId: string): boolean {
    const now = this.now.getTime();
    const times = (this.recent.get(userId) ?? []).filter((t) => now - t < 60_000);
    if (times.length >= this.opts.limits.perMinute) {
      this.recent.set(userId, times);
      return false;
    }
    times.push(now);
    this.recent.set(userId, times);
    return true;
  }

  private async actionsToday(userId: string): Promise<number> {
    const start = new Date(this.now);
    start.setUTCHours(0, 0, 0, 0);
    const row = await this.opts.db
      .selectFrom('ai_request')
      .select((eb) => eb.fn.countAll<number>().as('n'))
      .where('user_id', '=', userId)
      .where('created_at', '>=', start)
      .where('status', '!=', 'rejected')
      .executeTakeFirst();
    return Number(row?.n ?? 0);
  }

  async run<T>(
    userId: string,
    action: AiAction,
    run: (model: AiModel) => Promise<ModelResult<T>>,
  ): Promise<{ output: T; credits: number; balance: number }> {
    const { db, credits, model, limits } = this.opts;
    const price = AI_ACTIONS[action].credits;

    if (!limits.enabled) throw new AiError(503, 'ai_unavailable', 'AI features are not available right now.');
    if (!(await this.hasConsent(userId))) {
      throw new AiError(403, 'consent_required', 'Please agree to AI processing first.');
    }
    if (!this.takeMinuteSlot(userId)) {
      throw new AiError(429, 'rate_limited', 'Too many AI requests in a minute. Try again shortly.');
    }
    if ((await this.actionsToday(userId)) >= limits.perDay) {
      throw new AiError(429, 'daily_limit', `You've reached today's limit of ${limits.perDay} AI actions. It resets at midnight (UTC).`);
    }

    const started = this.now;
    const inserted = await db
      .insertInto('ai_request')
      .values({
        user_id: userId,
        action,
        status: 'held',
        credits: price,
        model: model.id,
        input_tokens: null,
        output_tokens: null,
        cost_micro_usd: null,
        latency_ms: null,
        error_code: null,
        created_at: started,
        finished_at: null,
      })
      .executeTakeFirstOrThrow();
    const requestId = Number(inserted.insertId);
    const finish = (values: Partial<Database['ai_request']>) =>
      db
        .updateTable('ai_request')
        .set({ ...values, finished_at: this.now, latency_ms: this.now.getTime() - started.getTime() } as never)
        .where('id', '=', requestId)
        .execute();

    try {
      await credits.hold(userId, price, requestId);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        await finish({ status: 'rejected', error_code: 'insufficient_credits' });
        throw new AiError(402, 'insufficient_credits', `This needs ${price} credits; you have ${err.balance}.`, {
          balance: err.balance,
          needed: price,
        });
      }
      await finish({ status: 'failed', error_code: 'hold_failed' });
      throw err;
    }

    try {
      const result = await run(model);
      await finish({
        status: 'succeeded',
        model: result.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cost_micro_usd: costMicroUsd(model, result.usage),
      });
      return { output: result.output, credits: price, balance: await credits.balance(userId) };
    } catch (err) {
      await credits.release(userId, requestId);
      const code = err instanceof AiError ? err.code : 'ai_failed';
      await finish({ status: 'failed', error_code: code });
      if (err instanceof AiError) throw err;
      throw new AiError(502, 'ai_failed', "The AI couldn't complete this. Your credits were not used — please try again.");
    }
  }
}
