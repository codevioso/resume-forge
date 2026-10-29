import type { LucideIcon } from 'lucide-react';
import { LifeBuoy, ReceiptText, ScrollText, ShieldCheck } from 'lucide-react';

export type LegalPageId = 'terms' | 'privacy' | 'refunds' | 'contact';

/** The legal pages, in the order every list of them uses. */
export const LEGAL_PAGES: { id: LegalPageId; to: string; title: string; short: string; blurb: string; icon: LucideIcon }[] = [
  { id: 'terms', to: '/terms', title: 'Terms of Service', short: 'Terms', blurb: 'The rules for using Paperplane and its credits.', icon: ScrollText },
  { id: 'privacy', to: '/privacy', title: 'Privacy Policy', short: 'Privacy', blurb: 'What we store, why, and how to delete it.', icon: ShieldCheck },
  { id: 'refunds', to: '/refunds', title: 'Refund & Cancellation Policy', short: 'Refunds', blurb: 'Payments, failed actions and refunds.', icon: ReceiptText },
  { id: 'contact', to: '/contact', title: 'Contact us', short: 'Contact', blurb: 'Who runs Paperplane and how to reach us.', icon: LifeBuoy },
];
