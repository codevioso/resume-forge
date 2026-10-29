import { ApiError } from './resumesApi';

/**
 * Credits and AI consent (api/src/credits/routes.ts), and the shared request
 * helper the AI actions use (api/src/ai/service.ts).
 *
 * Every call throws `CreditsApiError` on failure: an `ApiError` (so generic
 * handling of 401 / offline keeps working) with the server's message — written
 * to be shown to the user — plus its machine-readable `code` and details.
 * The AI endpoints answer with these codes:
 * - 402 `insufficient_credits` — details `{ balance, needed }`;
 * - 403 `consent_required` — ask for consent (see `useAiConsent`) and retry;
 * - 429 `rate_limited` / `daily_limit`;
 * - 503 `ai_unavailable`;
 * - 502 `ai_failed` — the credits were refunded.
 * Status 0: the request never reached the server (offline).
 */

export type AiAction = 'import' | 'projects' | 'tailor' | 'summary' | 'bullet';
export type CreditSource = 'trial' | 'purchase' | 'grant' | 'refund';

/** A grant of credits with its own expiry. Only live ones are listed: not expired, something left. */
export type CreditBatch = {
  id: number;
  source: CreditSource;
  amount: number;
  remaining: number;
  expiresAt: string;
  note: string | null;
};

/**
 * One ledger line. `hold` is credits taken by an AI action (negative);
 * `release` gives back a failed one's (positive); `expire` is what a batch
 * still held when it expired (negative, derived by the API: `id` < 0).
 */
export type CreditEntry = {
  id: number;
  kind: 'grant' | 'hold' | 'release' | 'expire';
  amount: number;
  action: AiAction | null;
  source: CreditSource;
  note: string | null;
  at: string;
  batchExpiresAt: string;
};

export type CreditsSummary = {
  balance: number;
  /** Soonest expiry first. */
  batches: CreditBatch[];
  /** Newest first. */
  history: CreditEntry[];
  prices: Record<AiAction, number>;
  trial: { credits: number; days: number };
  aiConsentAt: string | null;
};

export type CreditPack = { id: number; credits: number; validityDays: number; priceBdt: number };

export type AiErrorCode =
  | 'insufficient_credits'
  | 'consent_required'
  | 'rate_limited'
  | 'daily_limit'
  | 'ai_unavailable'
  | 'ai_failed';

export class CreditsApiError extends ApiError {
  constructor(
    message: string,
    status: number,
    readonly code: AiErrorCode | (string & {}) | null = null,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message, status);
  }
}

/** `{ balance, needed }` when `error` is the 402 an AI action answers when the balance is too low. */
export function insufficientCredits(error: unknown): { balance: number; needed: number } | null {
  if (!(error instanceof CreditsApiError) || error.code !== 'insufficient_credits') return null;
  const balance = Number(error.details.balance);
  const needed = Number(error.details.needed);
  return Number.isFinite(balance) && Number.isFinite(needed) ? { balance, needed } : null;
}

/**
 * A JSON (or multipart, for a `FormData` body) request to the API. Exported
 * for the AI actions: `callApi('POST', '/api/ai/bullet', input)`.
 */
export async function callApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined || isForm ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new CreditsApiError("You're offline. Check your connection and try again.", 0, 'offline');
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const { error, code, ...details } = (json ?? {}) as { error?: string; code?: string } & Record<string, unknown>;
    const message =
      error ?? (res.status >= 500 ? 'Something went wrong on our side. Please try again in a moment.' : `Request failed (HTTP ${res.status}).`);
    throw new CreditsApiError(message, res.status, code ?? null, details);
  }
  return json as T;
}

export function getCredits(): Promise<CreditsSummary> {
  return callApi('GET', '/api/credits');
}

export function getCreditPacks(): Promise<{ packs: CreditPack[]; purchasable: boolean }> {
  return callApi('GET', '/api/credits/packs');
}

export type AiConsent = { consented: boolean; at: string | null };

export function getAiConsent(): Promise<AiConsent> {
  return callApi('GET', '/api/ai/consent');
}

export function giveAiConsent(): Promise<AiConsent> {
  return callApi('POST', '/api/ai/consent');
}

export function withdrawAiConsent(): Promise<AiConsent> {
  return callApi('DELETE', '/api/ai/consent');
}
