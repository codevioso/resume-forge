import { useState, type ReactNode } from 'react';
import { ArrowUpRight, FileText, ShieldCheck, Sparkles, UserRoundCheck } from 'lucide-react';
import { giveAiConsent } from '../../lib/creditsApi';
import { Dialog, DialogIcon, SHEET_QUERY } from '../resumes/Dialog';
import { useMediaQuery } from '../editor/useEnvironment';
import { AuthAlert, Spinner } from '../account/AuthLayout';
import { setAiConsentAt } from './useCredits';

/** The privacy policy's section on AI processing. */
export const AI_PRIVACY_HREF = '/privacy#ai';

/**
 * Asked once, before the first AI action: what is sent to the AI, what is
 * kept, and that the user stays in charge. "Agree and continue" records the
 * consent on the server; "Not now" (or closing) records nothing.
 *
 * Use it through `useAiConsent().ensureConsent()` rather than directly; the
 * account page shows it on its own for "Allow AI processing".
 */
export function AiConsentDialog({ onDone }: { onDone: (consented: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phones: no badge above the title, so the whole sheet fits without scrolling.
  const isSheet = useMediaQuery(SHEET_QUERY);

  const agree = async () => {
    setBusy(true);
    setError(null);
    try {
      const { at } = await giveAiConsent();
      setAiConsentAt(at ?? new Date().toISOString());
      onDone(true);
    } catch (e) {
      setBusy(false);
      setError((e as Error).message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Dialog
      title="Before you use AI"
      // Phones: the points below say the same, and the sheet should fit without scrolling.
      description={isSheet ? undefined : 'Paperplane’s AI features use Claude, an AI model made by Anthropic. Here’s what that means for your information.'}
      icon={
        isSheet ? undefined : (
          <DialogIcon tone="aqua">
            <Sparkles className="size-6" aria-hidden="true" />
          </DialogIcon>
        )
      }
      onClose={busy ? undefined : () => onDone(false)}
      dismissible={!busy}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => onDone(false)} disabled={busy}>
            Not now
          </button>
          <button type="button" className="btn-primary" onClick={agree} disabled={busy} data-autofocus>
            {busy && <Spinner className="size-4" />}
            {busy ? 'Saving…' : 'Agree and continue'}
          </button>
        </>
      }
    >
      <ul className="divide-y divide-slate-200/70 rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 ring-inset">
        <Point icon={<FileText className="size-[18px]" aria-hidden="true" />} title="Only what you choose is sent">
          The text you pick, and text read from files you upload, goes to Anthropic’s Claude to write suggestions.
        </Point>
        <Point icon={<ShieldCheck className="size-[18px]" aria-hidden="true" />} title="Files aren’t kept">
          Uploaded files are read, then discarded — never stored. We log that an AI action ran, not what was in it.
        </Point>
        <Point icon={<UserRoundCheck className="size-[18px]" aria-hidden="true" />} title="You decide">
          Nothing changes in your resume until you accept a suggestion.
        </Point>
      </ul>
      <p className="mt-3.5 text-[13px] leading-relaxed text-slate-500">
        You can withdraw this at any time in your Account.{' '}
        <a
          href={AI_PRIVACY_HREF}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-0.5 font-semibold text-aqua-800 underline decoration-aqua-300 underline-offset-2 hover:decoration-aqua-700"
        >
          How we handle AI processing
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
      {error && (
        <AuthAlert tone="error" className="mt-4">
          {error}
        </AuthAlert>
      )}
    </Dialog>
  );
}

function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 px-3.5 py-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-white text-aqua-700 shadow-xs ring-1 ring-slate-200/80">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.9375rem] leading-6 font-semibold text-ink-900">{title}</span>
        <span className="block text-[13px] leading-snug text-slate-600">{children}</span>
      </span>
    </li>
  );
}
