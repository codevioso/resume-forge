import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { AuthAlert, AuthLayout, AuthLoading, OrDivider, SubmitButton, TextField } from '../../components/account/AuthLayout';
import { PasswordField } from '../../components/account/PasswordField';
import { GoogleButton } from '../../components/account/GoogleButton';
import {
  DEFAULT_NEXT,
  attempt,
  describeAuthError,
  emailLinkLanding,
  emailProblem,
  newPasswordProblem,
  safeNext,
  useAccount,
  useAuthMethods,
  withNext,
} from '../../components/account/authHelpers';

type Mode = 'password' | 'link';

export function SignUpPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const next = safeNext(params.get('next')) ?? DEFAULT_NEXT;
  const { user, isPending } = useAccount();
  const { methods, ready, unreachable } = useAuthMethods();

  const prefill = (location.state as { email?: string; name?: string } | null) ?? {};
  const [mode, setMode] = useState<Mode>('password');
  const [name, setName] = useState(prefill.name ?? '');
  const [email, setEmail] = useState(prefill.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string | null; email?: string | null; password?: string | null }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (user) return <Navigate to={next} replace />;
  if (isPending) return <AuthLoading label="Checking your session…" />;

  const passwordOn = methods.emailPassword;
  const linkOn = methods.magicLink;
  const activeMode: Mode = mode === 'link' && linkOn ? 'link' : passwordOn ? 'password' : linkOn ? 'link' : 'password';
  const nothingOn = ready && !unreachable && !methods.emailPassword && !methods.magicLink && !methods.google;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = {
      name: activeMode === 'password' && !name.trim() ? 'Enter your name.' : null,
      email: emailProblem(email),
      password: activeMode === 'password' ? newPasswordProblem(password) : null,
    };
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setBusy(true);
    setError(null);
    const address = email.trim();
    const displayName = name.trim();

    if (activeMode === 'link') {
      const failure = await attempt(() =>
        authClient.signIn.magicLink({
          email: address,
          name: displayName || undefined,
          callbackURL: next,
          newUserCallbackURL: next,
          errorCallbackURL: emailLinkLanding(next, { mode: 'link' }),
        }),
      );
      setBusy(false);
      if (failure) return setError(describeAuthError(failure));
      navigate(withNext('/check-email', next, { email: address, reason: 'link' }), { state: { name: displayName } });
      return;
    }

    // The confirmation link lands on the sign-in page, which sends a signed-in
    // user straight on to `next`, or explains an expired link.
    const failure = await attempt(() =>
      authClient.signUp.email({ name: displayName, email: address, password, callbackURL: emailLinkLanding(next) }),
    );
    setBusy(false);
    if (failure) {
      if (failure.code?.startsWith('USER_ALREADY_EXISTS')) {
        return setError('There’s already an account with this email. Sign in instead, or reset your password.');
      }
      return setError(describeAuthError(failure));
    }
    // Same screen whether or not the address already had an account: the
    // server does not say, so nobody can probe for who has signed up.
    navigate(withNext('/check-email', next, { email: address, reason: 'verify' }));
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Free. Save your resumes to your account and open them on any device."
      footer={
        <>
          Already have an account?{' '}
          <Link to={withNext('/signin', next)} className="font-semibold text-ink-900 underline decoration-slate-300 underline-offset-4 hover:decoration-ink-900">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <AuthAlert tone="error" className="mb-6">
          {error}
        </AuthAlert>
      )}
      {unreachable && !error && (
        <AuthAlert tone="error" className="mb-6">
          Couldn&rsquo;t reach Paperplane. Check your connection — you can still build a resume without an account.
        </AuthAlert>
      )}

      {nothingOn ? (
        <AuthAlert tone="info">
          Accounts aren&rsquo;t available right now. You can still{' '}
          <Link to="/templates" className="font-semibold underline underline-offset-2">
            build a resume without one
          </Link>
          .
        </AuthAlert>
      ) : (
        <>
          {methods.google && (
            <>
              <GoogleButton next={next} onError={setError} />
              {(passwordOn || linkOn) && <OrDivider />}
            </>
          )}

          {(passwordOn || linkOn) && (
            <form onSubmit={submit} noValidate className="space-y-5">
              <TextField
                ref={nameRef}
                id="signup-name"
                label={activeMode === 'link' ? 'Name (optional)' : 'Name'}
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                maxLength={100}
                autoFocus
              />
              <TextField
                ref={emailRef}
                id="signup-email"
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />

              {activeMode === 'password' ? (
                <PasswordField
                  ref={passwordRef}
                  id="signup-password"
                  label="Password"
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  hint="At least 8 characters. A longer passphrase is harder to guess."
                  showStrength
                />
              ) : (
                <p className="text-sm leading-relaxed text-slate-600">
                  No password to remember: we&rsquo;ll email you a link that creates your account and signs you in.
                </p>
              )}

              <div>
                <SubmitButton busy={busy} busyLabel={activeMode === 'link' ? 'Sending link…' : 'Creating account…'}>
                  {activeMode === 'link' ? 'Email me a sign-in link' : 'Create account'}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </SubmitButton>
                {activeMode === 'password' && (
                  <p className="mt-3 text-center text-[13px] text-slate-500">We&rsquo;ll email you a link to confirm your address.</p>
                )}
              </div>

              {passwordOn && linkOn && (
                <button
                  type="button"
                  onClick={() => {
                    setMode(activeMode === 'link' ? 'password' : 'link');
                    setErrors({});
                    setError(null);
                  }}
                  className="btn-ghost w-full text-[0.9375rem]"
                >
                  {activeMode === 'link' ? (
                    <>
                      <KeyRound className="size-4 text-aqua-700" aria-hidden="true" />
                      Use a password instead
                    </>
                  ) : (
                    <>
                      <Mail className="size-4 text-aqua-700" aria-hidden="true" />
                      Or email me a sign-in link
                    </>
                  )}
                </button>
              )}
            </form>
          )}
        </>
      )}
    </AuthLayout>
  );
}
