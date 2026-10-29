import { Link } from 'react-router-dom';
import { MailCheck, RotateCcw } from 'lucide-react';
import type { AiAction } from '../../lib/creditsApi';
import { Dialog, SHEET_QUERY } from '../resumes/Dialog';
import { useMediaQuery } from '../editor/useEnvironment';
import { useAccount } from '../account/authHelpers';
import { CREDITS_HREF } from './CreditBalance';
import { CreditGlyph } from './CreditGlyph';
import { CreditPackList } from './CreditPacks';
import { AI_ACTION_DOING, DEFAULT_TRIAL, creditsText, formatCredits } from './format';
import { useCredits } from './useCredits';

/**
 * What an AI action shows when the balance is too low (its 402
 * `insufficient_credits`, whose details give `balance` and `needed`): how
 * many are missing, the packs (coming soon), and the free trial.
 *
 * A bottom sheet on phones, a dialog above.
 */
export function OutOfCreditsSheet({
  needed,
  balance,
  action,
  onClose,
}: {
  needed: number;
  balance: number;
  action?: AiAction;
  onClose: () => void;
}) {
  const { user } = useAccount();
  const { summary } = useCredits();
  const trial = summary?.trial ?? DEFAULT_TRIAL;
  const missing = Math.max(0, needed - balance);
  const share = needed > 0 ? Math.min(1, balance / needed) : 0;
  const unconfirmed = user !== null && !user.emailVerified;
  // Phones: no badge above the title, so the whole sheet fits without scrolling.
  const isSheet = useMediaQuery(SHEET_QUERY);

  return (
    <Dialog
      title="Not enough credits"
      description={`${action ? AI_ACTION_DOING[action] : 'This'} needs ${creditsText(needed)}.`}
      icon={
        isSheet ? undefined : (
          <span className="grid size-12 place-items-center rounded-2xl bg-aqua-50 ring-1 ring-aqua-100 ring-inset">
            <CreditGlyph className="size-8" muted={balance === 0} />
          </span>
        )
      }
      onClose={onClose}
      size="md"
      footer={
        <>
          <Link to={CREDITS_HREF} onClick={onClose} className="btn-secondary">
            See my credits
          </Link>
          <button type="button" className="btn-primary" onClick={onClose} data-autofocus>
            OK
          </button>
        </>
      }
    >
      <div className="rounded-2xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-200/70 ring-inset" data-credit-shortfall={missing}>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <CreditGlyph className="size-6" muted={balance === 0} />
            <span>
              <span className="text-lg font-bold text-ink-900 tabular-nums">{formatCredits(balance)}</span> of{' '}
              {creditsText(needed)}
            </span>
          </p>
          <p className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset">
            {formatCredits(missing)} short
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
          role="meter"
          aria-label="Credits you have of those needed"
          aria-valuemin={0}
          aria-valuemax={needed}
          aria-valuenow={Math.min(balance, needed)}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-mint-400" style={{ width: `${share * 100}%` }} />
        </div>
      </div>

      {unconfirmed && (
        <p className="mt-4 flex gap-2.5 rounded-2xl bg-aqua-50/70 p-3.5 text-[13px] leading-relaxed text-slate-700 ring-1 ring-aqua-100 ring-inset">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-aqua-700" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink-900">Confirm your email to get {formatCredits(trial.credits)} free credits</span>, valid for{' '}
            {trial.days} days. Your{' '}
            <Link to="/account" onClick={onClose} className="font-semibold text-aqua-800 underline underline-offset-2">
              account page
            </Link>{' '}
            can send the link again.
          </span>
        </p>
      )}

      <CreditPackList variant="compact" className="mt-5" />

      <p className="mt-4 flex gap-2.5 text-[13px] leading-relaxed text-slate-600">
        <RotateCcw className="mt-0.5 size-4 shrink-0 text-aqua-700" aria-hidden="true" />
        <span>If an AI action fails, its credits come back automatically.</span>
      </p>
    </Dialog>
  );
}
