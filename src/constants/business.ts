import { APP_NAME } from './brand';

/**
 * Who runs Paperplane, as the legal pages (/terms, /privacy, /refunds,
 * /contact) state it.
 *
 * FILL THESE IN BEFORE APPLYING TO SSLCOMMERZ OR GOING LIVE.
 *
 * Every value in [square brackets] is a placeholder. The pages highlight
 * placeholders in amber, so anything still to be filled in is easy to spot on
 * the site; replace the whole string, brackets included, and the highlight
 * goes away. Use the same details as on your trade licence and your
 * SSLCommerz application.
 *
 * The pages also carry "[Review: …]" notes on business decisions (refund
 * windows, age limits…). Those live in the pages themselves
 * (src/pages/legal/): read each, adjust the text if needed, then delete the
 * note. Have the finished pages reviewed before going live.
 */
export const BUSINESS = {
  /** The product's name, as customers see it. */
  tradeName: APP_NAME,
  /** The name on your trade licence (a person's name for a sole proprietorship). */
  legalName: '[Your registered business name]',
  tradeLicense: '[Trade licence number]',
  /** Full postal address, as on the trade licence. */
  address: '[Registered business address]',
  country: 'Bangladesh',

  supportEmail: '[support@your-domain]',
  /** With the country code, e.g. +880 1XXX-XXXXXX. */
  phone: '[Support phone number]',
  /** When the phone and email are answered, e.g. "Sunday to Thursday, 10am to 6pm (Bangladesh time)". */
  supportHours: '[Days and hours you answer support]',
  /** How soon you reply, e.g. "within 2 working days". */
  responseTime: '[within 2 working days]',

  /** Shown as "Last updated" on every legal page. Change it whenever a page changes. */
  effectiveDate: '[Date these policies take effect]',

  /** Where the server (and so the database and its backups) is, e.g. "Singapore". */
  serverLocation: '[Country where your server runs]',
  /** The company the server is rented from. */
  hostingProvider: '[Hosting provider]',
  /** The service that sends Paperplane's emails (Resend, Postmark, Amazon SES…). */
  emailProvider: '[Email-sending service]',

  /** Paperplane is not directed at children younger than this. */
  minimumAge: '[13]',
  /** Which courts hear disputes, e.g. "the courts of Dhaka". Bangladeshi law applies either way. */
  courts: '[the courts of Dhaka]',
  /** How long a refund takes to reach the customer once approved. */
  refundTime: '[7–10] working days',
} as const;

export type BusinessField = keyof typeof BUSINESS;

/** True while a value is still a "[…]" placeholder. */
export function isPlaceholder(value: string): boolean {
  return /\[[^\]]+\]/.test(value);
}

/** True while any business detail is still a placeholder. */
export const BUSINESS_HAS_PLACEHOLDERS = Object.values(BUSINESS).some((v) => isPlaceholder(v));
