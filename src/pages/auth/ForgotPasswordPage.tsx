import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { AuthAlert, AuthLayout, SubmitButton, TextField } from '../../components/account/AuthLayout';
import { attempt, describeAuthError, emailProblem } from '../../components/account/authHelpers';

export function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(prefill);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = emailProblem(email);
    setFieldError(problem);
    if (problem) return emailRef.current?.focus();
    setBusy(true);
    setError(null);
    const address = email.trim();
    const failure = await attempt(() => authClient.requestPasswordReset({ email: address, redirectTo: '/reset-password' }));
    setBusy(false);
    if (failure) return setError(describeAuthError(failure));
    navigate(`/check-email?${new URLSearchParams({ email: address, reason: 'reset' })}`);
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email you use for Paperplane and we’ll send you a link to choose a new password."
      backTo="/signin"
      footer={
        <>
          Remembered it?{' '}
          <Link to="/signin" className="font-semibold text-ink-900 underline decoration-slate-300 underline-offset-4 hover:decoration-ink-900">
            Back to sign in
          </Link>
        </>
      }
    >
      {error && (
        <AuthAlert tone="error" className="mb-6">
          {error}
        </AuthAlert>
      )}
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          ref={emailRef}
          id="forgot-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError}
          autoFocus
        />
        <SubmitButton busy={busy} busyLabel="Sending link…">
          Send reset link
          <ArrowRight className="size-5" aria-hidden="true" />
        </SubmitButton>
        <p className="text-center text-[13px] leading-relaxed text-slate-500">
          Signed up with Google or an email link? This sets a password for your account too.
        </p>
      </form>
    </AuthLayout>
  );
}
