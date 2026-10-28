import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { LogIn, Trash2, X } from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { AuthAlert, Spinner, StatusIcon, TextField } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { attempt, describeAuthError } from './authHelpers';

const CONFIRM_WORD = 'DELETE';

/**
 * "Delete your account?" — a modal on larger screens, a bottom sheet on
 * phones. Says exactly what goes (the account and every saved resume, for
 * good), asks for the password when the account has one, and a typed
 * confirmation either way. Accounts without a password (Google, email links)
 * rely on a recent sign-in; when it is too old, offers to sign in again.
 */
export function DeleteAccountDialog({
  hasPassword,
  resumeCount,
  onClose,
  onDeleted,
  onReauthenticate,
}: {
  hasPassword: boolean;
  /** null when the count could not be loaded. */
  resumeCount: number | null;
  onClose: () => void;
  onDeleted: () => void;
  onReauthenticate: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  // Lock the page behind the dialog.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  // Focus moves in, stays in, and returns to the button that opened it.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') ?? []);
    (panel?.querySelector<HTMLElement>('input') ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!busyRef.current) onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [onClose]);

  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmed || busy) return;
    if (hasPassword && !password) {
      setPasswordError('Enter your password.');
      return passwordRef.current?.focus();
    }
    setBusy(true);
    setError(null);
    setPasswordError(null);
    const failure = await attempt(() => authClient.deleteUser(hasPassword ? { password } : {}));
    if (!failure) return onDeleted();
    setBusy(false);
    if (failure.code === 'SESSION_EXPIRED') return setNeedsSignIn(true);
    if (failure.code === 'INVALID_PASSWORD') {
      setPasswordError("That password isn't right.");
      return passwordRef.current?.focus();
    }
    setError(describeAuthError(failure));
  };

  const what =
    resumeCount === null
      ? 'every resume saved in it'
      : resumeCount === 0
        ? 'everything in it'
        : resumeCount === 1
          ? 'the 1 resume saved in it'
          : `all ${resumeCount} resumes saved in it`;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] motion-safe:animate-fade-in"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="pb-safe-4 relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white px-5 pt-2.5 shadow-lift motion-safe:animate-sheet-up sm:max-w-md sm:rounded-[1.75rem] sm:p-7 sm:motion-safe:animate-rise"
      >
        <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="btn-icon absolute top-3 right-3 text-slate-500 sm:top-4 sm:right-4"
          aria-label="Cancel"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="mt-4 sm:mt-0">
          <StatusIcon icon={Trash2} tone="red" />
        </div>
        <h2 id={titleId} className="mt-5 text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          Delete your account?
        </h2>
        <div id={descId} className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed text-slate-600">
          <p>
            This permanently deletes your Paperplane account and <strong className="font-semibold text-ink-900">{what}</strong>.
            It can&rsquo;t be undone.
          </p>
          {resumeCount !== 0 && <p className="text-sm">Want to keep a resume? Open it and download the PDF first.</p>}
        </div>

        {needsSignIn ? (
          <div className="mt-6 space-y-4">
            <AuthAlert tone="info" focus>
              For your security, deleting your account needs a recent sign-in. Sign in again, then come back to Account to
              finish.
            </AuthAlert>
            <button type="button" onClick={onReauthenticate} className="btn-primary btn-lg w-full">
              <LogIn className="size-5" aria-hidden="true" />
              Sign in again
            </button>
            <button type="button" onClick={onClose} className="btn-ghost w-full">
              Not now
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            {error && <AuthAlert tone="error">{error}</AuthAlert>}
            {hasPassword && (
              <PasswordField
                ref={passwordRef}
                id="delete-password"
                label="Your password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
                error={passwordError}
                disabled={busy}
              />
            )}
            <TextField
              id="delete-confirm"
              label={`Type ${CONFIRM_WORD} to confirm`}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
            />
            <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row">
              <button type="button" onClick={onClose} disabled={busy} className="btn-secondary btn-lg flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!confirmed || busy}
                className="btn btn-lg flex-1 bg-red-600 text-white shadow-soft hover:bg-red-700"
              >
                {busy ? (
                  <>
                    <Spinner />
                    Deleting…
                  </>
                ) : (
                  'Delete account'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
