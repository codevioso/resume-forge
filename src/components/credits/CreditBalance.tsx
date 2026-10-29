import { Link } from 'react-router-dom';
import { CreditGlyph } from './CreditGlyph';
import { creditsText, expiresSoon, expiryPhrase, formatCredits } from './format';
import { useCredits } from './useCredits';
import { cn } from '../../utils/cn';

/** Where the balance links: the account page's credits section. */
export const CREDITS_HREF = '/account#credits';

/**
 * The balance as a compact pill for headers: the credit coin and the number.
 * Hovering or focusing it shows when the soonest credits expire. Links to
 * the account page's credits section. Renders nothing when signed out or
 * when the credits could not be read.
 */
export function CreditBalance({ className }: { className?: string }) {
  const { summary, status } = useCredits();

  if (!summary) {
    if (status !== 'loading') return null;
    return <span className={cn('inline-block h-9 w-[4.5rem] shrink-0 rounded-full bg-slate-100 motion-safe:animate-pulse', className)} aria-hidden="true" />;
  }

  const { balance } = summary;
  const expiry = expiryPhrase(summary);
  const soon = expiresSoon(summary);

  return (
    <Link
      to={CREDITS_HREF}
      aria-label={`${creditsText(balance)}${expiry ? `, ${expiry}` : ''}`}
      data-credit-balance={balance}
      className={cn(
        'group relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white pr-3 pl-1 text-sm font-semibold text-ink-900 tabular-nums ring-1 ring-slate-200 transition ring-inset hover:bg-slate-50 hover:ring-slate-300 active:scale-[0.97]',
        balance === 0 && 'text-slate-500',
        className,
      )}
    >
      <CreditGlyph className="size-7" muted={balance === 0} />
      {formatCredits(balance)}
      {soon && <span className="absolute top-1 right-1 size-2 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden="true" />}

      {/* Hover card. The link's label already says all of this, so it is hidden from screen readers. */}
      <span
        aria-hidden="true"
        className="pointer-events-none invisible absolute top-[calc(100%+0.5rem)] right-0 z-50 w-max max-w-64 translate-y-1 rounded-xl bg-ink-900 px-3 py-2 text-left opacity-0 shadow-lift transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      >
        <span className="block text-[13px] font-semibold text-white">{creditsText(balance)}</span>
        <span className={cn('block text-xs font-medium', soon ? 'text-amber-200' : 'text-ink-100/80')}>
          {expiry ?? 'Nothing to expire'}
        </span>
      </span>
    </Link>
  );
}
