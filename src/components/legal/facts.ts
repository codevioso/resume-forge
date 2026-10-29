/**
 * The product facts the legal pages state about credits, in one place so the
 * Terms and the Refund policy can never disagree. They mirror the API's
 * configuration (docs/PLAN-2.0.md §4): change them here when that changes.
 */

/** Free trial: granted once per account, when its email is confirmed. */
export const TRIAL = { credits: 300, days: 15 } as const;

/** The initial packs. Prices may change; the price at checkout applies. */
export const PACKS = [
  { credits: 1000, days: 30, priceBdt: 50 },
  { credits: 1000, days: 90, priceBdt: 70 },
  { credits: 1000, days: 180, priceBdt: 80 },
] as const;

/** Credits returned for a failed action whose batch has meanwhile expired stay usable this long. */
export const REFUND_BATCH_DAYS = 7;

/** Nightly database backups are kept this long (docker/backup.sh, BACKUP_KEEP_DAYS). */
export const BACKUP_DAYS = 14;

/** How long after a payment problem the customer has to tell us. */
export const PAYMENT_CLAIM_DAYS = 7;

export const PAYMENT_METHODS = 'bKash, Nagad, Rocket and debit or credit cards';

/** "BDT 50". Inter has no taka sign (৳), and the fallback fonts draw it too small to read. */
export const taka = (n: number) => `BDT ${n.toLocaleString('en-US')}`;
export const count = (n: number) => n.toLocaleString('en-US');
