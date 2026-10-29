import type { AiAction } from '../../lib/creditsApi';
import { CreditGlyph } from './CreditGlyph';
import { DEFAULT_PRICES, creditsText } from './format';
import { useCredits } from './useCredits';
import { cn } from '../../utils/cn';

/** What `action` costs: the server's price once read, the usual one until then (and for guests). */
export function usePrice(action: AiAction): number {
  const { summary } = useCredits();
  return summary?.prices[action] ?? DEFAULT_PRICES[action];
}

/**
 * The price of an AI action, as a small badge for its button:
 * `<button>Improve <CreditCost action="bullet" /></button>` → "Improve · 5 credits".
 *
 * Give `action` to show the live price, or `credits` for a fixed number.
 * `tone="dark"` for dark buttons (btn-primary). The visible text is the full
 * "5 credits", so the button's accessible name includes the price.
 */
export function CreditCost({
  action,
  credits,
  tone = 'light',
  className,
}: {
  action?: AiAction;
  credits?: number;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const live = usePrice(action ?? 'bullet');
  const price = credits ?? (action ? live : 0);
  return (
    <span
      data-credit-cost={price}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full pr-2 pl-0.5 text-xs font-semibold whitespace-nowrap tabular-nums',
        tone === 'dark' ? 'bg-white/12 text-white ring-1 ring-white/20 ring-inset' : 'bg-aqua-50 text-ink-800 ring-1 ring-aqua-200/80 ring-inset',
        className,
      )}
    >
      <CreditGlyph className="size-5" />
      {creditsText(price)}
    </span>
  );
}
