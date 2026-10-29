import type { AiAction, CreditEntry, CreditSource, CreditsSummary } from '../../lib/creditsApi';

/**
 * Words and numbers for credits, shared by the balance pill, the account
 * page and the sheets. Dates read the way they do in Bangladesh: "13 Nov".
 */

/** What each AI action is called, matching api/src/ai/actions.ts. */
export const AI_ACTION_LABELS: Record<AiAction, string> = {
  import: 'Import a resume file',
  projects: 'Read GitHub / GitLab projects',
  tailor: 'Tailor to a job advert',
  summary: 'Write the summary',
  bullet: 'Improve a bullet point',
};

/** The same, as something that happened ("Imported a resume · −100"). */
const AI_ACTION_DONE: Record<AiAction, string> = {
  import: 'Imported a resume',
  projects: 'Read your projects',
  tailor: 'Tailored to a job advert',
  summary: 'Wrote the summary',
  bullet: 'Improved a bullet point',
};

/** The same, as an activity ("Improving a bullet point needs 5 credits"). */
export const AI_ACTION_DOING: Record<AiAction, string> = {
  import: 'Importing a resume',
  projects: 'Reading your projects',
  tailor: 'Tailoring to a job advert',
  summary: 'Writing the summary',
  bullet: 'Improving a bullet point',
};

/**
 * Prices until the server's list has loaded (and for guests, who cannot read
 * it). The server's `prices` always win: it is what is charged.
 */
export const DEFAULT_PRICES: Record<AiAction, number> = { import: 100, projects: 50, tailor: 40, summary: 10, bullet: 5 };

export const DEFAULT_TRIAL = { credits: 300, days: 15 };

export const SOURCE_LABELS: Record<CreditSource, string> = {
  trial: 'Free trial',
  purchase: 'Purchased',
  grant: 'Added by support',
  refund: 'Refund',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const number = new Intl.NumberFormat('en-US');
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const time = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });

/** 1000 → "1,000". */
export const formatCredits = (n: number) => number.format(n);

/** "1 credit", "1,000 credits". */
export const creditsText = (n: number) => `${formatCredits(n)} ${n === 1 ? 'credit' : 'credits'}`;

/** Prices in taka: "৳50". */
export const formatTaka = (n: number) => `৳${number.format(n)}`;

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "13 Nov" this year, "13 Nov 2027" otherwise. */
export function formatDay(iso: string, now = Date.now()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (d.getFullYear() === new Date(now).getFullYear() ? dayMonth : dayMonthYear).format(d);
}

/** Always with the year: "13 Nov 2026". */
export function formatDayFull(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dayMonthYear.format(d);
}

/** For the history: "29 Oct, 2:05 PM". */
export function formatWhen(iso: string, now = Date.now()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatDay(iso, now)}, ${time.format(d)}`;
}

/** Calendar days until `iso`: 0 = today, 1 = tomorrow. */
export function daysUntil(iso: string, now = Date.now()): number {
  return Math.round((startOfDay(Date.parse(iso)) - startOfDay(now)) / DAY_MS);
}

/** "today", "tomorrow", "13 Nov". */
function relativeDay(iso: string, now: number): string {
  const days = daysUntil(iso, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return formatDay(iso, now);
}

/** "in 15 days", "tomorrow", "today". */
export function inDays(iso: string, now = Date.now()): string {
  const days = daysUntil(iso, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/**
 * The credits that expire first: the soonest batch, plus any other batch
 * ending the same day. Null when there are none.
 */
export function soonestExpiry(summary: Pick<CreditsSummary, 'batches'>): { credits: number; expiresAt: string } | null {
  const first = summary.batches[0];
  if (!first) return null;
  const day = startOfDay(Date.parse(first.expiresAt));
  const credits = summary.batches
    .filter((b) => startOfDay(Date.parse(b.expiresAt)) === day)
    .reduce((sum, b) => sum + b.remaining, 0);
  return { credits, expiresAt: first.expiresAt };
}

/** "300 expire 13 Nov", "1 expires tomorrow". Null with nothing to expire. */
export function expiryPhrase(summary: Pick<CreditsSummary, 'batches'>, now = Date.now()): string | null {
  const soonest = soonestExpiry(summary);
  if (!soonest) return null;
  return `${formatCredits(soonest.credits)} ${soonest.credits === 1 ? 'expires' : 'expire'} ${relativeDay(soonest.expiresAt, now)}`;
}

/** Whether the soonest expiry is close enough to point out (3 days, like the reminder email). */
export function expiresSoon(summary: Pick<CreditsSummary, 'batches'>, now = Date.now()): boolean {
  const soonest = soonestExpiry(summary);
  return soonest !== null && daysUntil(soonest.expiresAt, now) <= 3;
}

// ---------------------------------------------------------------------------
// History.

const EXPIRED_DETAIL: Record<CreditSource, string> = {
  trial: 'Free trial credits',
  purchase: 'Purchased credits',
  grant: 'Credits added by support',
  refund: 'Refunded credits',
};

export type HistoryItem = {
  key: string;
  kind: CreditEntry['kind'];
  label: string;
  /** A second line: the support note, why a refund happened. */
  detail: string | null;
  amount: number;
  at: string;
};

function entryLabel(entry: CreditEntry): { label: string; detail: string | null } {
  switch (entry.kind) {
    case 'grant':
      if (entry.source === 'trial') return { label: 'Free trial', detail: null };
      if (entry.source === 'purchase') return { label: 'Bought credits', detail: entry.note };
      if (entry.source === 'refund') return { label: 'Refund', detail: entry.note };
      return { label: 'Added by support', detail: entry.note };
    case 'hold':
      return { label: entry.action ? AI_ACTION_DONE[entry.action] : 'AI action', detail: null };
    case 'release':
      return {
        label: 'Refund',
        detail: entry.action ? `${AI_ACTION_LABELS[entry.action]} didn’t finish` : 'An AI action didn’t finish',
      };
    case 'expire':
      return { label: 'Expired', detail: EXPIRED_DETAIL[entry.source] };
  }
}

/**
 * The ledger as a person reads it. One AI action can draw on two batches (or
 * be refunded into two), which the ledger records as two lines at the same
 * moment; they are shown as one.
 */
export function historyItems(entries: CreditEntry[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (const entry of entries) {
    const last = items[items.length - 1];
    const sameAction =
      last &&
      (entry.kind === 'hold' || entry.kind === 'release') &&
      last.kind === entry.kind &&
      last.at === entry.at &&
      last.label === entryLabel(entry).label;
    if (sameAction) {
      last.amount += entry.amount;
      continue;
    }
    items.push({ key: String(entry.id), kind: entry.kind, ...entryLabel(entry), amount: entry.amount, at: entry.at });
  }
  return items;
}

/** "+300", "−100" (a real minus sign). */
export const signedCredits = (n: number) => (n > 0 ? `+${formatCredits(n)}` : n < 0 ? `−${formatCredits(-n)}` : '0');
