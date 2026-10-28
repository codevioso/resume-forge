import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, LinkIcon } from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { AuthAlert, AuthLayout, StatusIcon, SubmitButton } from '../../components/account/AuthLayout';
import { PasswordField } from '../../components/account/PasswordField';
import { attempt, describeAuthError, newPasswordProblem } from '../../components/account/authHelpers';

/** Where the emailed reset link lands: `?token=…`, or `?error=INVALID_TOKEN` when the link was stale. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [expired, setExpired] = useState(!token || !!params.get('error'));
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (expired || !token) {
    return (
      <AuthLayout
        icon={<StatusIcon icon={LinkIcon} />}
        title="This link has expired"
        description="Password reset links work once, for one hour. Ask for a new one and use the most recent email."
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
        <Link to="/forgot-password" className="btn-primary btn-lg w-full">
          Send a new link
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </AuthLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = newPasswordProblem(password);
    setFieldError(problem);
    if (problem) return passwordRef.current?.focus();
    setBusy(true);
    setError(null);
    const failure = await attempt(() => authClient.resetPassword({ newPassword: password, token }));
    setBusy(false);
    if (!failure) {
      navigate('/signin?reset=done', { replace: true });
      return;
    }
    if (failure.code === 'INVALID_TOKEN' || failure.code === 'USER_NOT_FOUND') return setExpired(true);
    setError(describeAuthError(failure));
  };

  return (
    <AuthLayout
      title="Choose a new password"
      description="Saving it signs you out on all your devices. Then sign in again with the new password."
      backTo="/signin"
    >
      {error && (
        <AuthAlert tone="error" className="mb-6">
          {error}
        </AuthAlert>
      )}
      <form onSubmit={submit} noValidate className="space-y-5">
        <PasswordField
          ref={passwordRef}
          id="reset-password"
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={fieldError}
          hint="At least 8 characters. A longer passphrase is harder to guess."
          showStrength
          autoFocus
        />
        <SubmitButton busy={busy} busyLabel="Saving…">
          Save new password
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
