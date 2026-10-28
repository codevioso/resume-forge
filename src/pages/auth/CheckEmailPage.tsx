import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { ExternalLink, KeyRound, MailCheck, MailOpen, RefreshCw } from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { AuthAlert, AuthLayout, Spinner, StatusIcon } from '../../components/account/AuthLayout';
import {
  DEFAULT_NEXT,
  attempt,
  describeAuthError,
  emailLinkLanding,
  inboxShortcut,
  safeNext,
  useAccount,
  withNext,
} from '../../components/account/authHelpers';

type Reason = 'verify' | 'link' | 'reset';

const FIRST_WAIT = 30;
const NEXT_WAIT = 60;

/** Seconds left before the resend button works again. */
function useCooldown(initial: number) {
  const [until, setUntil] = useState(() => Date.now() + initial * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (now >= until) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [now, until]);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  const restart = (seconds: number) => {
    setUntil(Date.now() + seconds * 1000);
    setNow(Date.now());
  };
  return [left, restart] as const;
}

const formatWait = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * "Check your email", after sign-up (`reason=verify`), a sign-in link
 * (`link`) or a password reset (`reset`): which inbox, what to do there, a
 * resend button on a cooldown, and a way back to fix a mistyped address.
 */
export function CheckEmailPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { user } = useAccount();
  const email = params.get('email')?.trim() ?? '';
  const raw = params.get('reason');
  const reason: Reason = raw === 'link' || raw === 'reset' ? raw : 'verify';
  const next = safeNext(params.get('next')) ?? DEFAULT_NEXT;
  const name = (location.state as { name?: string } | null)?.name;

  const [left, restart] = useCooldown(FIRST_WAIT);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  // Opened the link in another tab? This tab notices when it is focused again.
  if (user && reason !== 'reset') return <Navigate to={next} replace />;

  const resend = async () => {
    if (!email || left > 0 || sending) return;
    setSending(true);
    setResult(null);
    const failure = await attempt(() => {
      if (reason === 'verify') return authClient.sendVerificationEmail({ email, callbackURL: emailLinkLanding(next) });
      if (reason === 'link') {
        return authClient.signIn.magicLink({
          email,
          name: name || undefined,
          callbackURL: next,
          newUserCallbackURL: next,
          errorCallbackURL: emailLinkLanding(next, { mode: 'link' }),
        });
      }
      return authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    });
    setSending(false);
    if (failure) {
      if (failure.status === 429) restart(NEXT_WAIT);
      setResult({ tone: 'error', text: describeAuthError(failure) });
      return;
    }
    restart(NEXT_WAIT);
    setResult({ tone: 'success', text: `Sent again to ${email}. It can take a minute to arrive.` });
  };

  const who = email ? <strong className="font-semibold break-all text-ink-900">{email}</strong> : 'your email address';
  const copy = {
    verify: {
      title: 'Confirm your email',
      body: <>We sent a link to {who}. Open it to confirm your address and you&rsquo;ll be signed in straight away.</>,
      note: 'The link works for 24 hours.',
      back: { to: '/signup', label: 'Wrong email? Go back' },
    },
    link: {
      title: 'Check your inbox',
      body: <>We sent a sign-in link to {who}. Open it on the device where you want to be signed in.</>,
      note: 'It works once, for 15 minutes.',
      back: { to: withNext('/signin', next, { mode: 'link' }), label: 'Wrong email? Go back' },
    },
    reset: {
      title: 'Check your email',
      body: <>If there&rsquo;s a Paperplane account for {who}, we&rsquo;ve sent it a link to choose a new password.</>,
      note: 'The link works for one hour.',
      back: { to: '/forgot-password', label: 'Wrong email? Go back' },
    },
  }[reason];
  const inbox = email ? inboxShortcut(email) : null;

  return (
    <AuthLayout
      icon={<StatusIcon icon={reason === 'reset' ? KeyRound : reason === 'link' ? MailOpen : MailCheck} />}
      title={copy.title}
      description={
        <>
          <p>{copy.body}</p>
          <p className="mt-2 text-sm text-slate-500">{copy.note}</p>
        </>
      }
      backTo="/signin"
      footer={
        <Link
          to={copy.back.to}
          state={{ email, name }}
          className="font-semibold text-ink-900 underline decoration-slate-300 underline-offset-4 hover:decoration-ink-900"
        >
          {copy.back.label}
        </Link>
      }
    >
      <div className="space-y-3">
        {inbox && (
          <a href={inbox.href} target="_blank" rel="noopener noreferrer" className="btn-primary btn-lg w-full">
            {inbox.label}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}
        {email && (
          <button type="button" onClick={resend} disabled={left > 0 || sending} className="btn-secondary btn-lg w-full">
            {sending ? <Spinner className="text-slate-500" /> : <RefreshCw className="size-4 text-aqua-700" aria-hidden="true" />}
            {sending ? 'Sending…' : left > 0 ? `Resend email in ${formatWait(left)}` : 'Resend email'}
          </button>
        )}
      </div>

      {result && (
        <AuthAlert tone={result.tone} className="mt-4">
          {result.text}
        </AuthAlert>
      )}

      <ul className="mt-7 space-y-2.5 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200/70 ring-inset">
        <li className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-aqua-500" aria-hidden="true" />
          <span>Not there after a minute? Check your spam or promotions folder for an email from Paperplane.</span>
        </li>
        {reason === 'verify' && (
          <li className="flex gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-aqua-500" aria-hidden="true" />
            <span>
              Already have an account with this email?{' '}
              <Link to={withNext('/signin', next)} state={{ email }} className="font-semibold text-ink-900 underline underline-offset-2">
                Sign in
              </Link>{' '}
              instead.
            </span>
          </li>
        )}
        {reason === 'reset' && (
          <li className="flex gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-aqua-500" aria-hidden="true" />
            <span>Choosing a new password signs you out on all your devices.</span>
          </li>
        )}
      </ul>
    </AuthLayout>
  );
}
