import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Gift, Hourglass, Info, LifeBuoy, MailCheck, Minus, Plus, RotateCcw, ShoppingBag } from 'lucide-react';
import type { AiAction, CreditBatch, CreditSource, CreditsSummary } from '../../lib/creditsApi';
import { CreditCost } from './CreditCost';
import { CreditGlyph } from './CreditGlyph';
import { CreditPackList, SoonChip } from './CreditPacks';
import {
  AI_ACTION_LABELS,
  SOURCE_LABELS,
  daysUntil,
  expiresSoon,
  expiryPhrase,
  formatCredits,
  formatDayFull,
  formatWhen,
  historyItems,
  inDays,
  signedCredits,
  soonestExpiry,
  type HistoryItem,
} from './format';
import { useCredits, useCreditPacks } from './useCredits';
import { cn } from '../../utils/cn';

/**
 * The account page's Credits section (`#credits`): balance and soonest
 * expiry, each live batch, what credits buy, the packs, and recent history.
 */
export function AccountCredits({ emailVerified }: { emailVerified: boolean }) {
  const { summary, status, error, refresh } = useCredits();
  const { purchasable } = useCreditPacks();

  return (
    <section id="credits" aria-labelledby="credits-title" className="mt-8 scroll-mt-20 md:scroll-mt-24">
      <SectionTitle id="credits-title">Credits</SectionTitle>
      {!summary ? (
        status === 'error' ? (
          <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.9375rem] text-slate-600">{error ?? 'Couldn’t load your credits.'}</p>
            <button type="button" className="btn-secondary" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        ) : (
          <div className="card h-56 motion-safe:animate-pulse" aria-hidden="true" />
        )
      ) : (
        <>
          <div className="card overflow-hidden" data-credits-card>
            <BalanceHero summary={summary} emailVerified={emailVerified} />
            {summary.batches.length > 0 && <Batches batches={summary.batches} />}
            <Prices prices={summary.prices} />
          </div>

          <div className="mt-6 mb-2.5 flex items-center gap-2 px-1">
            <h3 className="text-[0.9375rem] font-semibold text-ink-900">Buy credits</h3>
            {!purchasable && <SoonChip />}
          </div>
          <CreditPackList variant="full" />

          <h3 className="mt-6 mb-2.5 px-1 text-[0.9375rem] font-semibold text-ink-900">History</h3>
          <History summary={summary} />
        </>
      )}
    </section>
  );
}

export function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-2.5 px-1 text-[13px] font-semibold tracking-wide text-slate-500 uppercase">
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------

function BalanceHero({ summary, emailVerified }: { summary: CreditsSummary; emailVerified: boolean }) {
  const { balance, trial } = summary;
  const soonest = soonestExpiry(summary);
  const soon = expiresSoon(summary);

  return (
    <div className="relative px-5 pt-5 pb-5 sm:px-6 sm:pt-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(30rem_12rem_at_0%_0%,var(--color-aqua-50),transparent_70%),radial-gradient(24rem_10rem_at_100%_0%,var(--color-mint-50),transparent_70%)]"
      />
      <div className="relative flex items-center gap-4">
        <CreditGlyph className="size-14 drop-shadow-sm" muted={balance === 0} />
        <div className="min-w-0">
          <p className="text-[2.5rem] leading-none font-extrabold tracking-[-0.03em] text-ink-900 tabular-nums" data-credit-total={balance}>
            {formatCredits(balance)}
          </p>
          <p className="mt-1.5 text-sm font-medium text-slate-600">{balance === 1 ? 'credit' : 'credits'} available</p>
        </div>
      </div>

      {soonest && (
        <p
          className={cn(
            'relative mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 ring-inset',
            soon ? 'bg-amber-50 text-amber-900 ring-amber-200' : 'bg-white/80 text-ink-800 ring-slate-200',
          )}
          data-credit-expiry
        >
          <Hourglass className={cn('size-3.5 shrink-0', soon ? 'text-amber-600' : 'text-aqua-700')} aria-hidden="true" />
          <span className="truncate">
            {expiryPhrase(summary)}
            {daysUntil(soonest.expiresAt) >= 2 && <span className="text-slate-500"> · {inDays(soonest.expiresAt)}</span>}
          </span>
        </p>
      )}

      {balance === 0 && (
        <p className="relative mt-4 flex gap-2.5 rounded-2xl bg-white/80 p-3.5 text-[13px] leading-relaxed text-slate-600 ring-1 ring-slate-200 ring-inset">
          {emailVerified ? (
            <>
              <Info className="mt-0.5 size-4 shrink-0 text-aqua-700" aria-hidden="true" />
              <span>You’re out of credits for now. Credit packs are coming soon.</span>
            </>
          ) : (
            <>
              <MailCheck className="mt-0.5 size-4 shrink-0 text-aqua-700" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink-900">Confirm your email to get {formatCredits(trial.credits)} free credits</span>, valid
                for {trial.days} days. Use “Send a confirmation link” above if you can’t find the email.
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

const SOURCE_ICONS: Record<CreditSource, LucideIcon> = {
  trial: Gift,
  purchase: ShoppingBag,
  grant: LifeBuoy,
  refund: RotateCcw,
};

function Batches({ batches }: { batches: CreditBatch[] }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
      <h3 className="text-[13px] font-semibold text-slate-500">Your credits by expiry date</h3>
      <ul className="mt-1">
        {batches.map((batch) => {
          const Icon = SOURCE_ICONS[batch.source];
          const share = batch.amount > 0 ? batch.remaining / batch.amount : 0;
          return (
            <li key={batch.id} className="flex items-center gap-3.5 py-2.5" data-credit-batch={batch.source}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-ink-700 ring-1 ring-slate-200/80 ring-inset">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[0.9375rem] font-semibold text-ink-900">
                    {SOURCE_LABELS[batch.source]}
                    {/* Support and purchase notes say something; the trial's and a refund's repeat the label. */}
                    {batch.note && (batch.source === 'grant' || batch.source === 'purchase') && (
                      <span className="font-normal text-slate-500"> · {batch.note}</span>
                    )}
                  </p>
                  <p className="shrink-0 text-sm font-semibold text-ink-900 tabular-nums">
                    {formatCredits(batch.remaining)}
                    {batch.remaining !== batch.amount && <span className="font-normal text-slate-500"> of {formatCredits(batch.amount)}</span>}
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-mint-400" style={{ width: `${share * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[13px] text-slate-500">
                  Expires {formatDayFull(batch.expiresAt)} · {inDays(batch.expiresAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ACTION_ORDER: AiAction[] = ['import', 'projects', 'tailor', 'summary', 'bullet'];

function Prices({ prices }: { prices: Record<AiAction, number> }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6 sm:py-5">
      <h3 className="text-[13px] font-semibold text-slate-500">What credits buy</h3>
      <ul className="mt-2 divide-y divide-slate-200/60">
        {ACTION_ORDER.filter((a) => prices[a] !== undefined).map((action) => (
          <li key={action} className="flex min-h-11 items-center justify-between gap-3 text-sm text-ink-800" data-credit-price={action}>
            {AI_ACTION_LABELS[action]}
            <CreditCost credits={prices[action]} />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-500">
        Credits that expire soonest are used first. If an AI action fails, its credits come back automatically.
      </p>
    </div>
  );
}

const HISTORY_PAGE = 8;

function History({ summary }: { summary: CreditsSummary }) {
  const [showAll, setShowAll] = useState(false);
  const items = historyItems(summary.history);

  if (items.length === 0) {
    return <p className="card px-5 py-4 text-[0.9375rem] text-slate-500">Nothing yet. Credits you get and use will be listed here.</p>;
  }

  const shown = showAll ? items : items.slice(0, HISTORY_PAGE);
  return (
    <div className="card overflow-hidden">
      <ul className="divide-y divide-slate-100" data-credit-history>
        {shown.map((item) => (
          <HistoryRow key={item.key} item={item} />
        ))}
      </ul>
      {items.length > HISTORY_PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="flex min-h-12 w-full items-center justify-center border-t border-slate-100 text-sm font-semibold text-aqua-800 transition hover:bg-slate-50"
        >
          {showAll ? 'Show less' : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const positive = item.amount > 0;
  const Icon = item.kind === 'release' ? RotateCcw : item.kind === 'expire' ? Hourglass : positive ? Plus : Minus;
  return (
    <li className="flex items-center gap-3.5 px-4 py-3 sm:px-5" data-credit-entry={item.kind}>
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full',
          positive ? 'bg-mint-50 text-mint-700' : 'bg-slate-100 text-slate-500',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium text-ink-900">{item.label}</p>
        <p className="text-[13px] leading-snug text-slate-500">
          {item.detail && <>{item.detail} · </>}
          <time dateTime={item.at}>{formatWhen(item.at)}</time>
        </p>
      </div>
      <p className={cn('shrink-0 text-[0.9375rem] font-semibold tabular-nums', positive ? 'text-mint-700' : 'text-ink-800')}>
        <span className="sr-only">{positive ? 'Added ' : item.kind === 'expire' ? 'Expired ' : 'Used '}</span>
        {signedCredits(item.amount)}
      </p>
    </li>
  );
}
