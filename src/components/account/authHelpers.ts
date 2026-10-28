import { useEffect, useState } from 'react';
import { fetchAuthMethods, useSession, type AuthMethods } from '../../lib/authClient';

/**
 * Small pieces shared by the sign-in pages, the account page and the account
 * menu: where to go after signing in, which methods the server offers, and
 * turning Better Auth's errors into sentences a person can act on.
 */

/** Where a sign-in lands when the page that sent the user there did not say. */
export const DEFAULT_NEXT = '/resumes';

const AUTH_PAGES = ['/signin', '/signup', '/check-email', '/forgot-password', '/reset-password'];

/**
 * The `next` parameter, if it is a path on this site — never another origin
 * ("//evil.example", "/\\evil.example", "https://…") and never a sign-in page,
 * which would loop.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (AUTH_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** `path` with `?next=` added, unless next is the default (keeps URLs short). */
export function withNext(path: string, next: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams(extra);
  if (next !== DEFAULT_NEXT) params.set('next', next);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Where email links land: the sign-in page explains a failed link, or forwards a signed-in user on. */
export function emailLinkLanding(next: string, extra?: Record<string, string>): string {
  return withNext('/signin', next, extra);
}

// ---------------------------------------------------------------------------
// Sign-in methods the server can complete.

const METHODS_KEY = 'paperplane:auth-methods';
/** Before the server has answered: email is the usual setup; Google is never assumed. */
const ASSUMED: AuthMethods = { emailPassword: true, magicLink: true, google: false };

function readCachedMethods(): AuthMethods | null {
  try {
    const m = JSON.parse(window.localStorage.getItem(METHODS_KEY) ?? 'null');
    if (m && typeof m.emailPassword === 'boolean' && typeof m.magicLink === 'boolean' && typeof m.google === 'boolean') {
      return m;
    }
  } catch {
    /* unreadable: ask the server */
  }
  return null;
}

let methodsPromise: Promise<AuthMethods> | null = null;

function loadAuthMethods(): Promise<AuthMethods> {
  methodsPromise ??= fetchAuthMethods().then(
    (m) => {
      try {
        window.localStorage.setItem(METHODS_KEY, JSON.stringify(m));
      } catch {
        /* storage blocked: fine, just not cached */
      }
      return m;
    },
    (e) => {
      methodsPromise = null; // try again on the next page that asks
      throw e;
    },
  );
  return methodsPromise;
}

/**
 * Which sign-in methods to offer. Starts from the last answer this browser
 * saw (so buttons do not pop in on every visit), then follows the server.
 * `ready` is false until the server has answered; `unreachable` when it could not.
 */
export function useAuthMethods(): { methods: AuthMethods; ready: boolean; unreachable: boolean } {
  const [state, setState] = useState(() => {
    const cached = readCachedMethods();
    return { methods: cached ?? ASSUMED, ready: false, unreachable: false };
  });
  useEffect(() => {
    let live = true;
    loadAuthMethods().then(
      (methods) => live && setState({ methods, ready: true, unreachable: false }),
      () => live && setState((s) => ({ ...s, ready: true, unreachable: true })),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}

// ---------------------------------------------------------------------------
// The signed-in user.

const HINT_KEY = 'paperplane:signed-in';

/** Whether this browser was signed in last time: lets placeholders take the right shape before the session loads. */
export function readSignedInHint(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date | string;
};

/** The session's user (null when signed out) and whether the session is still loading. */
export function useAccount(): { user: AccountUser | null; isPending: boolean } {
  const { data, isPending } = useSession();
  const user = (data?.user as AccountUser | undefined) ?? null;
  useEffect(() => {
    if (isPending) return;
    try {
      window.localStorage.setItem(HINT_KEY, user ? '1' : '0');
    } catch {
      /* storage blocked */
    }
  }, [isPending, user]);
  return { user, isPending };
}

/** One or two letters for an avatar: first and last name, else the email's first letter. */
export function initialsOf(name: string | null | undefined, email: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const first = (s: string) => Array.from(s)[0] ?? '';
  if (words.length >= 2) return (first(words[0]) + first(words[words.length - 1])).toUpperCase();
  if (words.length === 1) return first(words[0]).toUpperCase();
  return first(email).toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Errors.

export type AuthFailure = { status: number; code?: string; message: string };

type AuthCallResult = { error?: { status?: number; code?: string; message?: string } | null };

/**
 * Runs a Better Auth client call and returns null on success, or what went
 * wrong. A request that never reached the server (offline) is status 0.
 */
export async function attempt(call: () => Promise<AuthCallResult>): Promise<AuthFailure | null> {
  try {
    const { error } = await call();
    if (!error) return null;
    return { status: error.status ?? 500, code: error.code, message: error.message ?? '' };
  } catch {
    return { status: 0, code: 'NETWORK', message: '' };
  }
}

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** A sentence for the person, for errors every form can hit. Pages handle their own special cases first. */
export function describeAuthError(f: AuthFailure): string {
  if (f.status === 0) {
    return isOffline()
      ? "You're offline. Check your connection and try again."
      : "Couldn't reach Paperplane. Check your connection and try again.";
  }
  if (f.status === 429) return 'Too many attempts. Please wait a minute and try again.';
  switch (f.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return "That email and password don't match. Check them and try again.";
    case 'INVALID_EMAIL':
      return 'Enter a valid email address.';
    case 'PASSWORD_TOO_SHORT':
      return 'Use at least 8 characters for your password.';
    case 'PASSWORD_TOO_LONG':
      return 'Use 128 characters or fewer for your password.';
    case 'INVALID_PASSWORD':
      return "That password isn't right.";
    case 'INVALID_TOKEN':
    case 'TOKEN_EXPIRED':
      return 'This link has expired or was already used.';
    case 'SESSION_EXPIRED':
      return 'For your security, please sign in again first.';
  }
  if (f.status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Form helpers.

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;

export function emailProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address, like name@example.com.';
  return null;
}

export function newPasswordProblem(value: string): string | null {
  if (!value) return 'Choose a password.';
  if (value.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (value.length > MAX_PASSWORD) return `Use ${MAX_PASSWORD} characters or fewer.`;
  return null;
}

/** A web-mail shortcut for the common providers, so "check your email" is one tap away. */
export function inboxShortcut(email: string): { label: string; href: string } | null {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (['gmail.com', 'googlemail.com'].includes(domain)) return { label: 'Open Gmail', href: 'https://mail.google.com/mail/' };
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) {
    return { label: 'Open Outlook', href: 'https://outlook.live.com/mail/' };
  }
  if (domain.startsWith('yahoo.')) return { label: 'Open Yahoo Mail', href: 'https://mail.yahoo.com/' };
  if (['icloud.com', 'me.com', 'mac.com'].includes(domain)) return { label: 'Open iCloud Mail', href: 'https://www.icloud.com/mail' };
  if (['proton.me', 'protonmail.com', 'pm.me'].includes(domain)) return { label: 'Open Proton Mail', href: 'https://mail.proton.me/' };
  return null;
}
