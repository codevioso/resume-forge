import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getCreditPacks, getCredits, type CreditPack, type CreditsSummary } from '../../lib/creditsApi';
import { useAccount } from '../account/authHelpers';

/**
 * The signed-in user's credits, read once and shared by every component that
 * shows them (the header pill, the account menu, the account page, the AI
 * buttons). A tiny store outside React, so the header and the page never
 * disagree and a page change does not read them again.
 *
 * It reads again when:
 * - `refreshCredits()` is called;
 * - an AI action reports a change with `creditsChanged(balance)`;
 * - the tab comes back into view after a while (another tab or device may
 *   have spent some, or a batch expired);
 * - the email gets confirmed (that grants the free trial).
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';

type Snapshot = {
  userId: string | null;
  verified: boolean;
  summary: CreditsSummary | null;
  status: Status;
  error: string | null;
};

const IDLE: Snapshot = { userId: null, verified: false, summary: null, status: 'idle', error: null };

/** Back in view after this long: read again. */
const STALE_MS = 30_000;

let snapshot: Snapshot = IDLE;
let fetchedAt = 0;
/** Bumped by every read and local change: an answer to an older read is dropped. */
let generation = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function read(userId: string): Promise<void> {
  const gen = ++generation;
  if (!snapshot.summary) emit({ status: 'loading', error: null });
  const promise = getCredits().then(
    (summary) => {
      if (gen !== generation || snapshot.userId !== userId) return;
      fetchedAt = Date.now();
      emit({ summary, status: 'ready', error: null });
    },
    (error: Error) => {
      if (gen !== generation || snapshot.userId !== userId) return;
      // Keep showing what we had; the next read may work.
      emit({ status: snapshot.summary ? 'ready' : 'error', error: error.message });
    },
  );
  inflight = promise.finally(() => {
    if (gen === generation) inflight = null;
  });
  return inflight;
}

/** Follow the session: load for a new user, forget on sign-out, read again when the email is confirmed. */
function sync(user: { id: string; emailVerified: boolean } | null) {
  if (!user) {
    if (snapshot.userId !== null) {
      generation++;
      inflight = null;
      emit(IDLE);
    }
    return;
  }
  if (snapshot.userId !== user.id) {
    snapshot = { ...IDLE, userId: user.id, verified: user.emailVerified };
    void read(user.id);
    return;
  }
  if (user.emailVerified && !snapshot.verified) {
    emit({ verified: true });
    void read(user.id);
  }
}

function onVisible() {
  if (document.visibilityState !== 'visible' || !snapshot.userId || inflight) return;
  if (Date.now() - fetchedAt > STALE_MS) void read(snapshot.userId);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    }
  };
}

const getSnapshot = () => snapshot;

/** Read the credits again now (resolves when the answer is in). */
export function refreshCredits(): Promise<void> {
  return snapshot.userId ? read(snapshot.userId) : Promise.resolve();
}

/**
 * For AI actions, after they run: shows the new `balance` at once (the AI
 * endpoints return it) and reads the details (batches, history) again.
 * Without a balance, just reads again — e.g. after a failed action, whose
 * credits were refunded.
 */
export function creditsChanged(balance?: number): Promise<void> {
  if (balance !== undefined && snapshot.summary && Number.isFinite(balance)) {
    emit({ summary: { ...snapshot.summary, balance } });
  }
  return refreshCredits();
}

/** Records a change to AI consent made here, so every view of it agrees at once. */
export function setAiConsentAt(at: string | null) {
  if (snapshot.summary) emit({ summary: { ...snapshot.summary, aiConsentAt: at } });
  void refreshCredits();
}

/**
 * The credits of whoever is signed in. `summary` is null while loading, when
 * signed out, or when it could not be read (`status` says which).
 */
export function useCredits(): {
  signedIn: boolean;
  summary: CreditsSummary | null;
  status: Status;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { user, isPending } = useAccount();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const userId = user?.id ?? null;
  const verified = user?.emailVerified ?? false;

  useEffect(() => {
    if (isPending) return;
    sync(userId ? { id: userId, emailVerified: verified } : null);
  }, [isPending, userId, verified]);

  const mine = userId !== null && snap.userId === userId;
  return {
    signedIn: userId !== null,
    summary: mine ? snap.summary : null,
    status: mine ? snap.status : userId || isPending ? 'loading' : 'idle',
    error: mine ? snap.error : null,
    refresh: refreshCredits,
  };
}

// ---------------------------------------------------------------------------
// Packs: the same for everyone and rarely changed, so read once per visit.

type PacksState = { packs: CreditPack[]; purchasable: boolean; status: 'loading' | 'ready' | 'error' };

let packsPromise: Promise<{ packs: CreditPack[]; purchasable: boolean }> | null = null;
let packsCache: PacksState | null = null;

function loadPacks() {
  packsPromise ??= getCreditPacks().then(
    (result) => {
      packsCache = { ...result, status: 'ready' };
      return result;
    },
    (error) => {
      packsPromise = null; // try again next time
      throw error;
    },
  );
  return packsPromise;
}

/** The credit packs on sale (shown as "coming soon" until `purchasable`). Signed-in users only. */
export function useCreditPacks(): PacksState & { retry: () => void } {
  const [state, setState] = useState<PacksState>(() => packsCache ?? { packs: [], purchasable: false, status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadPacks().then(
      (result) => live && setState({ ...result, status: 'ready' }),
      () => live && setState((s) => ({ ...s, status: 'error' })),
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }));
    setAttempt((n) => n + 1);
  }, []);
  return { ...state, retry };
}
