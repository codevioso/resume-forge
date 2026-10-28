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
  safeNext,
  useAccount,
  useAuthMethods,
  withNext,
} from '../../components/account/authHelpers';

type Mode = 'password' | 'link';
type Notice = { tone: 'error' | 'info' | 'success'; text: string } | null;

/** Why the user was sent here, from the URL: a finished reset, or an email link that did not work. */
function noticeFromUrl(params: URLSearchParams): Notice {
  if (params.get('reset') === 'done') {
    return { tone: 'success', text: 'Your password was changed. Sign in with your new password.' };
  }
  const error = params.get('error');
  if (!error) return null;
  if (error === 'google') {
    return { tone: 'error', text: "Signing in with Google didn't finish. Please try again, or use your email instead." };
  }
  return {
    tone: 'error',
    text:
      params.get('mode') === 'link'
        ? 'That sign-in link has expired or was already used. Enter your email and we’ll send a new one.'
        : 'That link has expired or was already used. Sign in below — if your email still needs confirming, we’ll send a fresh link.',
  };
}

export function SignInPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const next = safeNext(params.get('next')) ?? DEFAULT_NEXT;
  const { user, isPending } = useAccount();
  const { methods, ready, unreachable } = useAuthMethods();

  const prefill = (location.state as { email?: string } | null)?.email ?? '';
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'link' ? 'link' : 'password');
  const [email, setEmail] = useState(prefill);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [notice, setNotice] = useState<Notice>(() => noticeFromUrl(params));
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Signed in already (or just now, from an email link that landed here): go on.
  if (user) return <Navigate to={next} replace />;
  if (isPending && !params.get('error') && !params.get('reset')) {
    // Usually a blink; avoids flashing the form at someone who is signed in.
    return <AuthLoading label="Checking your session…" />;
  }

  const passwordOn = methods.emailPassword;
  const linkOn = methods.magicLink;
  const activeMode: Mode = mode === 'link' && linkOn ? 'link' : passwordOn ? 'password' : linkOn ? 'link' : 'password';
  const nothingOn = ready && !unreachable && !methods.emailPassword && !methods.magicLink && !methods.google;

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setNotice(null);
    requestAnimationFrame(() => (m === 'password' && email ? passwordRef : emailRef).current?.focus());
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const emailError = emailProblem(email);
    const passwordError = activeMode === 'password' && !password ? 'Enter your password.' : null;
    setErrors({ email: emailError, password: passwordError });
    if (emailError) return emailRef.current?.focus();
    if (passwordError) return passwordRef.current?.focus();

    setBusy(true);
    setNotice(null);
    const address = email.trim();

    if (activeMode === 'link') {
      const failure = await attempt(() =>
        authClient.signIn.magicLink({
          email: address,
          callbackURL: next,
          newUserCallbackURL: next,
          errorCallbackURL: emailLinkLanding(next, { mode: 'link' }),
        }),
      );
      setBusy(false);
      if (failure) return setNotice({ tone: 'error', text: describeAuthError(failure) });
      navigate(withNext('/check-email', next, { email: address, reason: 'link' }));
      return;
    }

    // callbackURL: where a successful sign-in goes, and where the confirmation
    // link lands if the server has to send one (unconfirmed email).
    const failure = await attempt(() => authClient.signIn.email({ email: address, password, callbackURL: next }));
    if (!failure) {
      // The client follows callbackURL itself; this covers it if it does not.
      navigate(next, { replace: true });
      return;
    }
    setBusy(false);
    if (failure.code === 'EMAIL_NOT_VERIFIED' || failure.status === 403) {
      setNotice({
        tone: 'info',
        text: `Please confirm your email first. We just sent a new confirmation link to ${address} — open it to finish signing in.`,
      });
      return;
    }
    if (failure.code === 'INVALID_EMAIL_OR_PASSWORD' || failure.status === 401) {
      setNotice({ tone: 'error', text: "That email and password don't match. Check them and try again, or reset your password." });
      setPassword('');
      passwordRef.current?.focus();
      return;
    }
    setNotice({ tone: 'error', text: describeAuthError(failure) });
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to open your saved resumes on any device."
      footer={
        <>
          New to Paperplane?{' '}
          <Link to={withNext('/signup', next)} className="font-semibold text-ink-900 underline decoration-slate-300 underline-offset-4 hover:decoration-ink-900">
            Create an account
          </Link>
        </>
      }
    >
      {notice && (
        <AuthAlert tone={notice.tone} className="mb-6">
          {notice.text}
        </AuthAlert>
      )}
      {unreachable && !notice && (
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
              <GoogleButton next={next} onError={(text) => setNotice({ tone: 'error', text })} />
              {(passwordOn || linkOn) && <OrDivider />}
            </>
          )}

          {(passwordOn || linkOn) && (
            <form onSubmit={submit} noValidate className="space-y-5">
              <TextField
                ref={emailRef}
                id="signin-email"
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoFocus={!prefill}
              />

              {activeMode === 'password' ? (
                <PasswordField
                  ref={passwordRef}
                  id="signin-password"
                  label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  autoFocus={!!prefill}
                  labelAside={
                    <Link
                      to="/forgot-password"
                      state={{ email: email.trim() }}
                      className="-my-2 rounded-md py-2 text-sm font-medium text-aqua-800 hover:text-ink-900"
                    >
                      Forgot password?
                    </Link>
                  }
                />
              ) : (
                <p className="text-sm leading-relaxed text-slate-600">
                  We&rsquo;ll email you a link that signs you in &mdash; no password needed. It works once, for 15 minutes.
                </p>
              )}

              <SubmitButton busy={busy} busyLabel={activeMode === 'link' ? 'Sending link…' : 'Signing in…'}>
                {activeMode === 'link' ? 'Email me a sign-in link' : 'Sign in'}
                <ArrowRight className="size-5" aria-hidden="true" />
              </SubmitButton>

              {passwordOn && linkOn && (
                <button
                  type="button"
                  onClick={() => switchMode(activeMode === 'link' ? 'password' : 'link')}
                  className="btn-ghost w-full text-[0.9375rem]"
                >
                  {activeMode === 'link' ? (
                    <>
                      <KeyRound className="size-4 text-aqua-700" aria-hidden="true" />
                      Sign in with a password instead
                    </>
                  ) : (
                    <>
                      <Mail className="size-4 text-aqua-700" aria-hidden="true" />
                      Email me a sign-in link instead
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
