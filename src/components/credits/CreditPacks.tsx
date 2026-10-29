import type { CSSProperties } from 'react';
import { Clock3 } from 'lucide-react';
import { CreditGlyph } from './CreditGlyph';
import { formatCredits, formatTaka } from './format';
import { useCreditPacks } from './useCredits';
import { cn } from '../../utils/cn';

const PAYMENT_NOTE = 'Paying with bKash, Nagad, Rocket or a card is coming soon.';

/**
 * The credit packs on sale. Until payments arrive (`purchasable` false) each
 * is shown with a disabled "Coming soon" button.
 *
 * `full`: the account page (cards from `sm` up, rows on phones).
 * `compact`: a short list inside a sheet.
 */
export function CreditPackList({ variant, className }: { variant: 'full' | 'compact'; className?: string }) {
  const { packs, purchasable, status, retry } = useCreditPacks();

  if (status === 'error' && packs.length === 0) {
    if (variant === 'compact') return null;
    return (
      <div className={cn('card flex items-center justify-between gap-3 p-4 text-sm text-slate-600 sm:p-5', className)}>
        Couldn’t load the credit packs.
        <button type="button" className="btn-secondary min-h-10 px-4" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }
  if (status === 'ready' && packs.length === 0) return null;

  const soon = !purchasable;
  const loading = status === 'loading' && packs.length === 0;

  if (variant === 'compact') {
    return (
      <div className={className}>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink-900">More credits</h3>
          {soon && <SoonChip />}
        </div>
        <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200/80 ring-inset" aria-busy={loading || undefined}>
          {loading
            ? [0, 1, 2].map((i) => <PackRowSkeleton key={i} />)
            : packs.map((pack) => (
                <li key={pack.id} className="flex items-center gap-3 px-3.5 py-2.5" data-credit-pack={pack.id}>
                  <CreditGlyph className="size-6" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold text-ink-900">{formatCredits(pack.credits)} credits</span>
                    <span className="text-slate-500"> · {pack.validityDays} days</span>
                  </span>
                  <Taka value={pack.priceBdt} className="text-sm font-bold text-ink-900" />
                </li>
              ))}
        </ul>
        {soon && <p className="mt-2 text-xs text-slate-500">{PAYMENT_NOTE}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <ul className="grid gap-2.5 sm:grid-cols-3 sm:gap-3" aria-busy={loading || undefined}>
        {loading
          ? [0, 1, 2].map((i) => (
              <li key={i} className="card h-[4.5rem] motion-safe:animate-pulse sm:h-48" aria-hidden="true" />
            ))
          : packs.map((pack) => (
              <li
                key={pack.id}
                data-credit-pack={pack.id}
                className="card flex items-center gap-3.5 p-4 sm:flex-col sm:items-stretch sm:gap-0 sm:p-5"
              >
                <CreditGlyph className="size-10 sm:size-9" />
                <div className="min-w-0 flex-1 sm:mt-4">
                  <p className="text-[0.9375rem] font-bold text-ink-900 sm:text-lg sm:leading-6">
                    {formatCredits(pack.credits)} <span className="font-semibold">credits</span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    Valid for {pack.validityDays} days
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:mt-4 sm:items-stretch sm:gap-3">
                  <Taka value={pack.priceBdt} className="text-lg font-extrabold tracking-tight text-ink-900 sm:text-2xl" />
                  <button
                    type="button"
                    disabled={soon}
                    aria-label={soon ? `${formatCredits(pack.credits)} credits for ${formatTaka(pack.priceBdt)}: coming soon` : undefined}
                    className="btn-secondary min-h-8 rounded-lg px-2.5 text-xs disabled:opacity-100 disabled:bg-slate-50 disabled:text-slate-500 sm:min-h-10 sm:text-sm"
                  >
                    {soon ? 'Coming soon' : 'Buy'}
                  </button>
                </div>
              </li>
            ))}
      </ul>
      {soon && <p className="mt-2.5 px-1 text-[13px] text-slate-500">{PAYMENT_NOTE}</p>}
    </div>
  );
}

/**
 * The taka sign comes from a Bengali system font: Inter has none, and the
 * browser's own fallback can pick one where it is tiny.
 */
const TAKA_FONT: CSSProperties = {
  fontFamily: '"Nirmala UI", "Noto Sans Bengali", "Kohinoor Bangla", "Bangla Sangam MN", "Vrinda", sans-serif',
  fontWeight: 600,
  marginRight: '0.05em',
};

/** A price in taka: "৳50". */
export function Taka({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      <span style={TAKA_FONT}>৳</span>
      {formatCredits(value)}
    </span>
  );
}

export function SoonChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-amber-800 uppercase ring-1 ring-amber-200 ring-inset">
      Coming soon
    </span>
  );
}

function PackRowSkeleton() {
  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5" aria-hidden="true">
      <span className="size-6 rounded-full bg-slate-100 motion-safe:animate-pulse" />
      <span className="h-3.5 flex-1 rounded bg-slate-100 motion-safe:animate-pulse" />
      <span className="h-3.5 w-10 rounded bg-slate-100 motion-safe:animate-pulse" />
    </li>
  );
}
