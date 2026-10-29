import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Files, LogOut, UserRound } from 'lucide-react';
import { authClient } from '../../lib/authClient';
import { Avatar } from './Avatar';
import { DEFAULT_NEXT, attempt, readSignedInHint, safeNext, useAccount, withNext, type AccountUser } from './authHelpers';
import { CREDITS_HREF, CreditBalance } from '../credits/CreditBalance';
import { CreditGlyph } from '../credits/CreditGlyph';
import { DEFAULT_TRIAL, creditsText, expiryPhrase, formatCredits } from '../credits/format';
import { useCredits } from '../credits/useCredits';
import { cn } from '../../utils/cn';

/**
 * Sign-in links that bring the user back to where they were. Not to the
 * guest editor, though: signing in moves that resume into the account, so
 * the list of saved resumes is where it will be.
 */
function useSignInLinks() {
  const { pathname, search } = useLocation();
  const next = pathname === '/' || pathname === '/editor' ? DEFAULT_NEXT : (safeNext(pathname + search) ?? DEFAULT_NEXT);
  return { signIn: withNext('/signin', next), signUp: withNext('/signup', next) };
}

/** Signs out and returns to the home page. Resolves to an error message if it could not. */
function useSignOut() {
  const navigate = useNavigate();
  return async (): Promise<string | null> => {
    const failure = await attempt(() => authClient.signOut());
    if (failure) {
      return failure.status === 0 ? "You're offline, so we couldn't sign you out. Try again when you're back online." : "Couldn't sign out. Please try again.";
    }
    navigate('/');
    return null;
  };
}

/**
 * The account control for page headers: "Sign in" when signed out; the user's
 * avatar opening a menu (credits, My resumes, Account, Sign out) when signed
 * in. On desktop (lg and up) the credit balance sits next to the avatar.
 *
 * `compact`: icon-only trigger for tight phone app bars (the balance is then
 * only inside the menu).
 */
export function AccountMenu({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { user, isPending } = useAccount();
  const links = useSignInLinks();
  // Before the session is known, hold the space of what this browser showed last time.
  const [wasSignedIn] = useState(readSignedInHint);

  if (isPending) {
    if (compact || wasSignedIn) {
      return (
        <span className={cn('inline-flex size-11 shrink-0 items-center justify-center', className)} aria-hidden="true">
          {wasSignedIn && <span className="size-9 rounded-full bg-slate-100 motion-safe:animate-pulse" />}
        </span>
      );
    }
    return <SignedOutLinks links={links} className={cn('invisible', className)} placeholder />;
  }

  if (!user) {
    if (compact) {
      return (
        <Link to={links.signIn} className={cn('btn-icon shrink-0', className)} aria-label="Sign in" title="Sign in">
          <UserRound className="size-[22px]" aria-hidden="true" />
        </Link>
      );
    }
    return <SignedOutLinks links={links} className={className} />;
  }

  return <UserMenu user={user} compact={compact} className={className} />;
}

function SignedOutLinks({
  links,
  className,
  placeholder = false,
}: {
  links: { signIn: string; signUp: string };
  className?: string;
  placeholder?: boolean;
}) {
  const hide = placeholder ? { 'aria-hidden': true, tabIndex: -1 } : {};
  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      {/* Only where there is room: next to a page's own call to action it would crowd the header. */}
      <Link to={links.signUp} className="btn-ghost hidden px-3.5 font-medium text-slate-600 hover:text-ink-900 2xl:inline-flex" {...hide}>
        Create account
      </Link>
      <Link to={links.signIn} className="btn-ghost px-3.5 text-ink-900" {...hide}>
        Sign in
      </Link>
    </div>
  );
}

const ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.9375rem] font-medium text-ink-800 outline-none transition hover:bg-slate-50 focus-visible:bg-slate-100 focus:bg-slate-100';

function UserMenu({ user, compact, className }: { user: AccountUser; compact: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [focusOnOpen, setFocusOnOpen] = useState<'first' | 'last'>('first');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { pathname } = useLocation();
  const signOut = useSignOut();

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  /** What the arrow keys move through: the credits row above the menu, then its items. */
  const stops = () =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-menu-stop], [role="menuitem"]') ?? []);

  // Opening moves focus into the menu.
  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusOnOpen === 'last' ? list[list.length - 1] : list[0])?.focus();
  }, [open, focusOnOpen]);

  // A press anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Following one of its links closes it.
  useEffect(() => setOpen(false), [pathname]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const list = stops();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (j: number) => {
      e.preventDefault();
      list[(j + list.length) % list.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') setOpen(false);
  };

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusOnOpen(e.key === 'ArrowUp' ? 'last' : 'first');
      setOpen(true);
    }
  };

  const doSignOut = async () => {
    setBusy(true);
    setError(null);
    const problem = await signOut();
    setBusy(false);
    if (problem) setError(problem);
    else setOpen(false);
  };

  const label = user.name?.trim() || user.email;

  return (
    <div ref={rootRef} className={cn('relative flex shrink-0 items-center gap-1', className)}>
      {!compact && <CreditBalance className="hidden lg:inline-flex" />}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${label}`}
        title={label}
        onClick={() => {
          setFocusOnOpen('first');
          setOpen((o) => !o);
        }}
        onKeyDown={onButtonKey}
        className={cn(
          'inline-flex size-11 items-center justify-center rounded-full transition active:scale-95',
          open ? 'bg-ink-50' : 'hover:bg-ink-50',
        )}
      >
        <Avatar user={user} className="ring-2 ring-white" />
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+0.375rem)] right-0 z-50 w-[min(18rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-lift motion-safe:animate-fade-in"
          onKeyDown={onMenuKey}
        >
          <div className="flex items-center gap-3 px-3 pt-2.5 pb-3">
            <Avatar user={user} className="size-10 text-sm" />
            <div className="min-w-0 leading-tight">
              {user.name?.trim() && <p className="truncate text-[0.9375rem] font-semibold text-ink-900">{user.name}</p>}
              <p className="truncate text-[13px] text-slate-500">{user.email}</p>
            </div>
          </div>
          <CreditsRow emailVerified={user.emailVerified} onNavigate={() => setOpen(false)} />
          <div className="mx-1.5 h-px bg-slate-100" aria-hidden="true" />
          <div ref={menuRef} id={menuId} role="menu" aria-label="Account" className="pt-1.5">
            <Link to="/resumes" role="menuitem" tabIndex={-1} className={ITEM} onClick={() => setOpen(false)}>
              <Files className="size-[18px] text-slate-500" aria-hidden="true" />
              My resumes
            </Link>
            <Link to="/account" role="menuitem" tabIndex={-1} className={ITEM} onClick={() => setOpen(false)}>
              <UserRound className="size-[18px] text-slate-500" aria-hidden="true" />
              Account
            </Link>
            <div role="separator" className="mx-1.5 my-1.5 h-px bg-slate-100" />
            <button type="button" role="menuitem" tabIndex={-1} className={ITEM} onClick={doSignOut} disabled={busy}>
              <LogOut className="size-[18px] text-slate-500" aria-hidden="true" />
              {busy ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
          {error && (
            <p role="alert" className="px-3 pt-1 pb-2 text-[13px] leading-snug text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The balance inside the account menu (and the landing page's phone sheet):
 * "Credits · 300 expire 13 Nov · 300", linking to the account page's credits.
 * Reached with the arrow keys like the menu's items (`data-menu-stop`).
 */
function CreditsRow({
  emailVerified,
  onNavigate,
  className,
  inMenu = true,
}: {
  emailVerified: boolean;
  onNavigate: () => void;
  className?: string;
  inMenu?: boolean;
}) {
  const { summary, status } = useCredits();
  if (!summary) {
    if (status !== 'loading') return null;
    return <div className={cn('mx-1.5 mb-1.5 h-14 rounded-xl bg-slate-50 motion-safe:animate-pulse', className)} aria-hidden="true" />;
  }

  const { balance } = summary;
  const detail =
    expiryPhrase(summary) ??
    (emailVerified ? 'None right now' : `Confirm your email to get ${formatCredits(summary.trial?.credits ?? DEFAULT_TRIAL.credits)} free`);

  return (
    <Link
      to={CREDITS_HREF}
      onClick={onNavigate}
      tabIndex={inMenu ? -1 : undefined}
      data-menu-stop={inMenu ? '' : undefined}
      data-credits-row={balance}
      aria-label={`Credits: ${creditsText(balance)}. ${detail}`}
      className={cn(
        'mx-1.5 mb-1.5 flex min-h-14 items-center gap-3 rounded-xl bg-gradient-to-r from-aqua-50 to-mint-50/70 py-2 pr-2.5 pl-2.5 ring-1 ring-aqua-100 transition ring-inset outline-none hover:from-aqua-100/70 hover:to-mint-100/60 focus-visible:ring-2 focus-visible:ring-aqua-700 active:scale-[0.99]',
        className,
      )}
    >
      <CreditGlyph className="size-8" muted={balance === 0} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[0.9375rem] font-semibold text-ink-900">Credits</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-600">{detail}</span>
      </span>
      <span className="text-base font-bold text-ink-900 tabular-nums">{formatCredits(balance)}</span>
      <ChevronRight className="-ml-1 size-4 shrink-0 text-slate-400" aria-hidden="true" />
    </Link>
  );
}

/**
 * The account block in the landing page's phone menu sheet: sign in / create
 * account, or who is signed in with My resumes and Sign out.
 */
export function AccountSheetSection({ onNavigate }: { onNavigate: () => void }) {
  const { user, isPending } = useAccount();
  const links = useSignInLinks();
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return <div className="mt-3 h-12" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to={links.signIn} onClick={onNavigate} className="btn-secondary min-h-12 text-[0.9375rem]">
          Sign in
        </Link>
        <Link to={links.signUp} onClick={onNavigate} className="btn-secondary min-h-12 text-[0.9375rem]">
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-[1.25rem] bg-slate-50 p-1.5 ring-1 ring-slate-200/70 ring-inset">
      <Link
        to="/account"
        onClick={onNavigate}
        className="flex min-h-14 items-center gap-3 rounded-2xl px-2.5 py-1.5 transition hover:bg-white active:bg-white"
      >
        <Avatar user={user} className="size-10 text-sm" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.9375rem] font-semibold text-ink-900">{user.name?.trim() || 'Your account'}</span>
          <span className="block truncate text-[13px] text-slate-500">{user.email}</span>
        </span>
        <ChevronRight className="size-5 text-slate-400" aria-hidden="true" />
      </Link>
      <CreditsRow emailVerified={user.emailVerified} onNavigate={onNavigate} inMenu={false} className="mx-0 mt-1.5 mb-0 rounded-2xl" />
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Link to="/resumes" onClick={onNavigate} className="btn min-h-12 bg-white text-[0.9375rem] text-ink-900 ring-1 ring-slate-200 hover:bg-slate-50">
          <Files className="size-[18px] text-aqua-700" aria-hidden="true" />
          My resumes
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const problem = await signOut();
            setBusy(false);
            if (problem) setError(problem);
            else onNavigate();
          }}
          className="btn min-h-12 bg-white text-[0.9375rem] text-ink-900 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <LogOut className="size-[18px] text-slate-500" aria-hidden="true" />
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
      {error && (
        <p role="alert" className="px-2 pt-2 pb-1 text-[13px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
