import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Files,
  KeyRound,
  LogOut,
  Mail,
  MonitorSmartphone,
  Pencil,
  Trash2,
} from 'lucide-react';
import { authClient } from '../lib/authClient';
import { listResumes } from '../lib/resumesApi';
import { BrandMark, PlaneMark } from '../components/BrandMark';
import { AccountMenu } from '../components/account/AccountMenu';
import { Avatar } from '../components/account/Avatar';
import { AuthAlert, AuthLoading, Spinner } from '../components/account/AuthLayout';
import { DeleteAccountDialog } from '../components/account/DeleteAccountDialog';
import { GoogleG } from '../components/account/GoogleButton';
import { PasswordField } from '../components/account/PasswordField';
import {
  attempt,
  describeAuthError,
  newPasswordProblem,
  useAccount,
  useAuthMethods,
  type AccountUser,
} from '../components/account/authHelpers';
import { APP_NAME } from '../constants/brand';
import { cn } from '../utils/cn';

/**
 * `/account`: who is signed in, how they sign in, their password, their
 * devices, signing out, and deleting the account with everything in it.
 */
export function AccountPage() {
  const { user, isPending } = useAccount();
  const [deleted, setDeleted] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);

  if (deleted) return <AccountDeleted />;
  if (leaving) return <AuthLoading label={leaving} />;
  if (isPending) return <AuthLoading label="Loading your account…" />;
  if (!user) return <Navigate to="/signin?next=%2Faccount" replace />;
  return <AccountView user={user} onDeleted={() => setDeleted(true)} onLeaving={setLeaving} />;
}

function AccountHeader() {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-1.5 md:h-16 md:gap-2 md:px-6 lg:px-8">
        <Link to="/resumes" className="btn-icon shrink-0 md:hidden" aria-label="My resumes">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <p className="flex-1 truncate text-center text-[15px] font-semibold text-ink-900 md:hidden" aria-hidden="true">
          Account
        </p>
        <span className="size-11 shrink-0 md:hidden" aria-hidden="true" />

        <Link to="/" aria-label={`${APP_NAME} home`} className="hidden shrink-0 rounded-lg md:block">
          <BrandMark className="h-9" />
        </Link>
        <div className="hidden flex-1 md:block" />
        <Link to="/resumes" className="btn-ghost hidden px-3.5 md:inline-flex">
          <Files className="size-4 text-aqua-700" aria-hidden="true" />
          My resumes
        </Link>
        <AccountMenu className="hidden md:flex" />
      </div>
    </header>
  );
}

type Providers = { password: boolean; google: boolean } | null;

function AccountView({
  user,
  onDeleted,
  onLeaving,
}: {
  user: AccountUser;
  onDeleted: () => void;
  onLeaving: (label: string) => void;
}) {
  const navigate = useNavigate();
  const { methods } = useAuthMethods();
  const [providers, setProviders] = useState<Providers>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [resumeCount, setResumeCount] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const { data } = await authClient.listSessions();
      setSessionCount(Array.isArray(data) ? data.length : null);
    } catch {
      setSessionCount(null);
    }
  }, []);

  useEffect(() => {
    let live = true;
    authClient
      .listAccounts()
      .then(({ data }) => {
        if (!live) return;
        const ids = Array.isArray(data) ? data.map((a) => a.providerId) : [];
        setProviders({ password: ids.includes('credential'), google: ids.includes('google') });
      })
      .catch(() => live && setProviders({ password: false, google: false }));
    listResumes()
      .then((r) => live && setResumeCount(r.resumes.length))
      .catch(() => live && setResumeCount(null));
    void loadSessions();
    return () => {
      live = false;
    };
  }, [loadSessions]);

  const signOut = async () => {
    setSignOutError(null);
    onLeaving('Signing out…');
    const failure = await attempt(() => authClient.signOut());
    if (failure) {
      onLeaving('');
      setSignOutError(describeAuthError(failure));
      return;
    }
    navigate('/', { replace: true });
  };

  const reauthenticate = async () => {
    onLeaving('Signing out…');
    await attempt(() => authClient.signOut());
    const mode = providers?.password ? '' : methods.magicLink ? '&mode=link' : '';
    navigate(`/signin?next=%2Faccount${mode}`, { replace: true });
  };

  const hasPassword = providers?.password ?? false;

  return (
    <div className="min-h-dvh bg-slate-50">
      <AccountHeader />
      <main className="pb-safe-4 mx-auto w-full max-w-2xl px-4 pt-5 sm:px-6 sm:pt-10">
        <h1 className="sr-only text-3xl font-extrabold tracking-[-0.03em] text-ink-900 md:not-sr-only md:mb-8">Account</h1>

        <ProfileCard user={user} />

        <Section title="How you sign in">
          {providers === null ? (
            <RowSkeleton />
          ) : (
            <>
              {(methods.emailPassword || hasPassword) && (
                <PasswordRow
                  hasPassword={hasPassword}
                  email={user.email}
                  onSessionsChanged={loadSessions}
                />
              )}
              {methods.magicLink && (
                <Row icon={Mail} title="Email sign-in link" detail="We email you a link that signs you in, no password needed.">
                  <StatusChip tone="mint">On</StatusChip>
                </Row>
              )}
              {(providers.google || methods.google) && (
                <Row
                  iconNode={<GoogleG className="size-5" />}
                  title="Google"
                  detail={
                    providers.google
                      ? 'Connected. Use “Continue with Google” to sign in.'
                      : `Sign in with Google using ${user.email} to connect it.`
                  }
                >
                  {providers.google ? <StatusChip tone="mint">Connected</StatusChip> : <StatusChip tone="slate">Not connected</StatusChip>}
                </Row>
              )}
            </>
          )}
        </Section>

        <Section title="Devices">
          <DevicesRow count={sessionCount} onChanged={loadSessions} />
        </Section>

        <section className="mt-8">
          {signOutError && (
            <AuthAlert tone="error" className="mb-3">
              {signOutError}
            </AuthAlert>
          )}
          <button type="button" onClick={signOut} className="btn-secondary btn-lg w-full bg-white">
            <LogOut className="size-5 text-slate-500" aria-hidden="true" />
            Sign out
          </button>
        </section>

        <section aria-labelledby="danger-title" className="mt-10 mb-6">
          <h2 id="danger-title" className="mb-2.5 px-1 text-[13px] font-semibold tracking-wide text-red-700 uppercase">
            Delete account
          </h2>
          <div className="rounded-2xl border border-red-200/80 bg-white p-5 shadow-soft sm:p-6">
            <p className="text-[0.9375rem] leading-relaxed text-slate-600">
              Permanently delete your account and{' '}
              {resumeCount === null
                ? 'every resume saved in it'
                : resumeCount === 1
                  ? 'the 1 resume saved in it'
                  : `the ${resumeCount} resumes saved in it`}
              . This can&rsquo;t be undone.
            </p>
            <button type="button" onClick={() => setDeleting(true)} className="btn-danger mt-4 w-full sm:w-auto">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete my account…
            </button>
          </div>
        </section>
      </main>

      {deleting && (
        <DeleteAccountDialog
          hasPassword={hasPassword}
          resumeCount={resumeCount}
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
          onReauthenticate={reauthenticate}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="mb-2.5 px-1 text-[13px] font-semibold tracking-wide text-slate-500 uppercase">
        {title}
      </h2>
      <div className="card divide-y divide-slate-100 overflow-hidden">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  iconNode,
  title,
  detail,
  children,
  below,
}: {
  icon?: LucideIcon;
  iconNode?: ReactNode;
  title: string;
  detail?: ReactNode;
  children?: ReactNode;
  below?: ReactNode;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-ink-700 ring-1 ring-slate-200/80 ring-inset">
          {iconNode ?? (Icon && <Icon className="size-5" aria-hidden="true" />)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold text-ink-900">{title}</p>
          {detail && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{detail}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
      {below}
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5" aria-hidden="true">
      <span className="size-10 rounded-xl bg-slate-100 motion-safe:animate-pulse" />
      <span className="flex-1 space-y-2">
        <span className="block h-3.5 w-32 rounded bg-slate-100 motion-safe:animate-pulse" />
        <span className="block h-3 w-48 rounded bg-slate-100 motion-safe:animate-pulse" />
      </span>
    </div>
  );
}

function StatusChip({ tone, children }: { tone: 'mint' | 'slate' | 'amber'; children: ReactNode }) {
  const tones = {
    mint: 'bg-mint-50 text-mint-800 ring-mint-200',
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', tones[tone])}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------

function ProfileCard({ user }: { user: AccountUser }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return setError('Enter your name.');
    setBusy(true);
    setError(null);
    const failure = await attempt(() => authClient.updateUser({ name: value }));
    setBusy(false);
    if (failure) return setError(describeAuthError(failure));
    setEditing(false);
  };

  const resend = async () => {
    setResent('sending');
    const failure = await attempt(() => authClient.sendVerificationEmail({ email: user.email, callbackURL: '/account' }));
    setResent(failure ? 'failed' : 'sent');
  };

  const since = new Date(user.createdAt);
  const sinceText = Number.isNaN(since.getTime())
    ? null
    : since.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  return (
    <section aria-label="Profile" className="card relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(28rem_10rem_at_100%_0%,var(--color-aqua-50),transparent_70%),radial-gradient(22rem_9rem_at_0%_0%,var(--color-mint-50),transparent_70%)]"
      />
      <PlaneMark className="absolute top-4 right-5 h-6 opacity-70" />
      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Avatar user={user} className="size-16 text-xl ring-4 ring-white" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={save} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <label htmlFor="account-name" className="sr-only">
                  Name
                </label>
                <input
                  id="account-name"
                  className="field-input min-h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  autoFocus
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'account-name-error' : undefined}
                />
                {error && (
                  <p id="account-name-error" className="mt-1.5 text-[13px] text-red-700">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={busy}>
                  {busy ? <Spinner className="size-4" /> : null}
                  Save
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1 sm:flex-none"
                  onClick={() => {
                    setEditing(false);
                    setName(user.name ?? '');
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className={cn('truncate text-xl font-bold tracking-tight', user.name?.trim() ? 'text-ink-900' : 'text-slate-400')}>
                {user.name?.trim() || 'Add your name'}
              </p>
              <button type="button" onClick={() => setEditing(true)} className="btn-icon size-9 shrink-0 text-slate-500" aria-label="Edit name">
                <Pencil className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="min-w-0 text-[0.9375rem] break-all text-slate-600">{user.email}</span>
            {user.emailVerified ? (
              <StatusChip tone="mint">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified
              </StatusChip>
            ) : (
              <StatusChip tone="amber">
                <CircleAlert className="size-3.5" aria-hidden="true" />
                Not confirmed
              </StatusChip>
            )}
          </div>
          {!user.emailVerified && (
            <p className="mt-2 text-[13px] text-slate-600">
              {resent === 'sent' ? (
                'Confirmation link sent. Check your inbox.'
              ) : (
                <button type="button" onClick={resend} disabled={resent === 'sending'} className="font-semibold text-aqua-800 underline underline-offset-2">
                  {resent === 'sending' ? 'Sending…' : resent === 'failed' ? 'Couldn’t send. Try again' : 'Send a confirmation link'}
                </button>
              )}
            </p>
          )}
          {sinceText && <p className="mt-2 text-[13px] text-slate-500">Member since {sinceText}</p>}
        </div>
      </div>
    </section>
  );
}

function PasswordRow({
  hasPassword,
  email,
  onSessionsChanged,
}: {
  hasPassword: boolean;
  email: string;
  onSessionsChanged: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [errors, setErrors] = useState<{ current?: string | null; next?: string | null }>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setPassword = async () => {
    // Accounts without a password get one through the reset email, which proves the inbox.
    setBusy(true);
    const failure = await attempt(() => authClient.requestPasswordReset({ email, redirectTo: '/reset-password' }));
    setBusy(false);
    if (failure) return setError(describeAuthError(failure));
    navigate(`/check-email?${new URLSearchParams({ email, reason: 'reset' })}`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = { current: current ? null : 'Enter your current password.', next: newPasswordProblem(next) };
    if (!found.next && next === current) found.next = 'Choose a password different from your current one.';
    setErrors(found);
    if (found.current || found.next) return;
    setBusy(true);
    setError(null);
    const failure = await attempt(() =>
      authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: signOutOthers }),
    );
    setBusy(false);
    if (failure) {
      if (failure.code === 'INVALID_PASSWORD') return setErrors({ current: "That password isn't right." });
      return setError(describeAuthError(failure));
    }
    setOpen(false);
    setCurrent('');
    setNext('');
    setDone(signOutOthers ? 'Password changed. Your other devices were signed out.' : 'Password changed.');
    if (signOutOthers) onSessionsChanged();
  };

  return (
    <Row
      icon={KeyRound}
      title="Password"
      detail={hasPassword ? 'Sign in with your email and password.' : 'No password yet. Add one to sign in without email links.'}
      below={
        <>
          {done && !open && (
            <AuthAlert tone="success" className="mt-4">
              {done}
            </AuthAlert>
          )}
          {error && !open && (
            <AuthAlert tone="error" className="mt-4">
              {error}
            </AuthAlert>
          )}
          {open && (
            <form onSubmit={submit} noValidate className="mt-5 space-y-4 border-t border-slate-100 pt-5">
              {error && <AuthAlert tone="error">{error}</AuthAlert>}
              <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
              <PasswordField
                id="current-password"
                label="Current password"
                autoComplete="current-password"
                value={current}
                onChange={setCurrent}
                error={errors.current}
                autoFocus
              />
              <PasswordField
                id="new-password"
                label="New password"
                autoComplete="new-password"
                value={next}
                onChange={setNext}
                error={errors.next}
                hint="At least 8 characters."
                showStrength
              />
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.9375rem] text-ink-800">
                <input
                  type="checkbox"
                  className="size-[18px] rounded"
                  checked={signOutOthers}
                  onChange={(e) => setSignOutOthers(e.target.checked)}
                />
                Sign out of my other devices
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy && <Spinner className="size-4" />}
                  {busy ? 'Saving…' : 'Change password'}
                </button>
              </div>
            </form>
          )}
        </>
      }
    >
      {!open &&
        (hasPassword ? (
          <button
            type="button"
            className="btn-secondary min-h-10 px-4"
            onClick={() => {
              setOpen(true);
              setDone(null);
              setError(null);
            }}
          >
            Change
          </button>
        ) : (
          <button type="button" className="btn-secondary min-h-10 px-4" onClick={setPassword} disabled={busy}>
            {busy ? 'Sending…' : 'Add'}
          </button>
        ))}
    </Row>
  );
}

function DevicesRow({ count, onChanged }: { count: number | null; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const revoke = async () => {
    setBusy(true);
    setResult(null);
    const failure = await attempt(() => authClient.revokeOtherSessions());
    setBusy(false);
    if (failure) return setResult({ tone: 'error', text: describeAuthError(failure) });
    setResult({ tone: 'success', text: 'Signed out everywhere except here.' });
    onChanged();
  };

  const detail =
    count === null
      ? 'Signed in on a computer you no longer use? Sign it out from here.'
      : count <= 1
        ? 'Only this device is signed in.'
        : `Signed in on ${count} devices, including this one.`;

  return (
    <Row
      icon={MonitorSmartphone}
      title="Other devices"
      detail={detail}
      below={
        <>
          {/* Phones: the button gets its own line, so the description is not squeezed. */}
          <button type="button" onClick={revoke} disabled={busy || count === 1} className="btn-secondary mt-3.5 w-full sm:hidden">
            {busy ? <Spinner className="size-4" /> : null}
            Sign out other devices
          </button>
          {result && (
            <AuthAlert tone={result.tone} className="mt-4">
              {result.text}
            </AuthAlert>
          )}
        </>
      }
    >
      <button type="button" onClick={revoke} disabled={busy || count === 1} className="btn-secondary hidden min-h-10 px-4 sm:inline-flex">
        {busy ? <Spinner className="size-4" /> : null}
        Sign out others
      </button>
    </Row>
  );
}

function AccountDeleted() {
  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center bg-white px-4 text-center">
      <PlaneMark className="h-10" />
      <h1 className="mt-6 text-[1.75rem] font-extrabold tracking-[-0.03em] text-ink-900 sm:text-3xl" tabIndex={-1} ref={(el) => el?.focus()}>
        Your account was deleted
      </h1>
      <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-slate-600">
        Your account and the resumes saved in it are gone for good. You can still build a resume here without an account
        whenever you like.
      </p>
      <Link to="/" className="btn-primary btn-lg mt-8">
        Back to {APP_NAME}
      </Link>
    </div>
  );
}
