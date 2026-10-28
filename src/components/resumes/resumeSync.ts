import { ApiError, saveResume, type SavedResume } from '../../lib/resumesApi';
import {
  contentHash,
  contentOf,
  mergeContent,
  partHashes,
  removeDraft,
  sameContent,
  writeDraft,
  type PartHashes,
  type ResumeContent,
} from './drafts';

/**
 * Keeps one saved resume in step with the account.
 *
 * Edits are saved a second after the user stops typing. Until the server has
 * them they are also kept on the device (drafts.ts), so going offline, a
 * failed save or a closed tab loses nothing.
 *
 * Saves are optimistic: each carries the version it was made on. When another
 * device saved in between, the server refuses (409) and answers with its copy.
 * Changes to different parts (the content, the template, the title) merge by
 * themselves; only when both sides changed the same part does the user choose.
 *
 * Plain TypeScript, no React: it outlives the editor component by as long as
 * its last save takes, and is driven through `update`, `attach` and `detach`.
 */

export type SyncStatus =
  /** Everything is on the server. */
  | 'saved'
  /** Changes are waiting for the debounce or on their way. */
  | 'saving'
  /** No connection. Changes are kept on the device and sent on reconnect. */
  | 'offline'
  /** The server refused or failed. Retried with backoff. */
  | 'error'
  /** Another device changed the same part. The user must choose. */
  | 'conflict'
  /** The session ended. Changes wait on the device until the user signs in. */
  | 'signedOut'
  /** The resume was deleted (on another device). */
  | 'gone';

export type SyncSnapshot = {
  status: SyncStatus;
  /** Changes exist that the server does not have. */
  dirty: boolean;
  /** Those changes are safe in the device's storage (false: storage refused). */
  keptLocally: boolean;
  /** For `conflict`: the server's copy. */
  conflict: SavedResume | null;
  /** For `error`: the server's message, and its HTTP status (4xx: the server refused this content; retrying won't help). */
  error: string | null;
  errorStatus: number | null;
  lastSavedAt: number | null;
};

/** Merged or replaced content the editor must show (another device's change). */
export type AdoptListener = (content: ResumeContent) => void;

const DEBOUNCE_MS = 1000;
const OFFLINE_RETRY_MS = 15_000;
const FIRST_RETRY_MS = 2000;
const MAX_RETRY_MS = 60_000;

type Failure = 'offline' | 'error' | 'conflict' | 'signedOut' | 'gone';
/** Failures that wait for the user rather than a retry. */
const BLOCKING: ReadonlySet<Failure> = new Set(['conflict', 'signedOut', 'gone']);

/** Cheap per-keystroke form, for "has anything changed since the last save". */
type RawParts = { data: string; templateId: string; title: string };
const rawParts = (c: ResumeContent): RawParts => ({ data: JSON.stringify(c.data), templateId: c.templateId, title: c.title });

export class ResumeSync {
  readonly id: string;
  private readonly owner = Math.random().toString(36).slice(2);

  private local: ResumeContent;
  private localRaw: RawParts;
  /** The server's version this device last saw, and its parts (null: not known, e.g. opened offline). */
  private version: number;
  private base: PartHashes | null;
  /** What was last confirmed saved, in the cheap form (null: not known). */
  private synced: RawParts | null;

  private inflight = false;
  private queued = false;
  private lastSent: { fromVersion: number; hash: string; content: ResumeContent | null } | null = null;
  private failure: Failure | null = null;
  private conflict: SavedResume | null = null;
  private error: string | null = null;
  private errorStatus: number | null = null;
  private keptLocally = true;
  private lastSavedAt: number | null;
  private retryDelay = FIRST_RETRY_MS;
  private debounceTimer: number | undefined;
  private retryTimer: number | undefined;
  private attached = false;

  private snapshot: SyncSnapshot;
  private listeners = new Set<() => void>();
  private adoptListener: AdoptListener | null = null;

  constructor(
    id: string,
    init: {
      /** What the editor starts with. */
      content: ResumeContent;
      /** The server version `content` is based on. */
      version: number;
      /** That version's parts, when known (for merging). */
      base: PartHashes | null;
      /** That version's content, when known. Content that differs from it is unsynced; null sends everything. */
      server: ResumeContent | null;
      /** Start in conflict with this server copy (a stale draft that cannot merge). */
      conflict?: SavedResume | null;
      /** A save from an earlier visit whose answer never came (see Draft.sending). */
      sending?: { fromVersion: number; hash: string } | null;
      lastSavedAt?: number | null;
    },
  ) {
    this.id = id;
    this.local = init.content;
    this.localRaw = rawParts(init.content);
    this.version = init.version;
    this.base = init.base;
    this.synced = init.server ? (init.server === init.content ? this.localRaw : rawParts(init.server)) : null;
    this.lastSavedAt = init.lastSavedAt ?? null;
    if (init.sending) this.lastSent = { ...init.sending, content: null };
    if (init.conflict) {
      this.failure = 'conflict';
      this.conflict = init.conflict;
    }
    if (this.dirty()) this.keptLocally = this.persistDraft(init.sending ?? null);
    this.snapshot = this.compute();
  }

  // --- React glue -------------------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  /** Called with merged content when another device's change is taken in. */
  onAdopt(listener: AdoptListener | null) {
    this.adoptListener = listener;
  }

  /** Start listening to the page (connection, visibility, leaving). Idempotent. */
  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('pagehide', this.handlePageHide);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    if (this.dirty()) this.scheduleSave(0);
  }

  /** Stop listening. Pending changes are sent now: the page stays, only the editor leaves. */
  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('pagehide', this.handlePageHide);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.clearTimeout(this.debounceTimer);
    window.clearTimeout(this.retryTimer);
    this.save();
  }

  // --- Editing ----------------------------------------------------------------

  /** The editor's current content. Call on every change. */
  update(content: ResumeContent) {
    this.local = content;
    this.localRaw = rawParts(content);
    if (!this.dirty()) {
      window.clearTimeout(this.debounceTimer);
      if (!this.inflight) removeDraft(this.id, this.owner);
      this.keptLocally = true;
    } else {
      this.keptLocally = this.persistDraft(null);
      // Known to be offline: say so now rather than "Saving…" until the attempt fails.
      if (!this.failure && navigator.onLine === false) this.failure = 'offline';
      if (!this.failure || !BLOCKING.has(this.failure)) this.scheduleSave(DEBOUNCE_MS);
    }
    this.emit();
  }

  /** Save now rather than after the debounce (Ctrl+S, a retry button). */
  saveNow() {
    if (this.failure === 'signedOut' || this.failure === 'gone') return;
    this.save();
  }

  /** Conflict: overwrite the other device's copy with this one. */
  keepMine() {
    const theirs = this.conflict;
    if (!theirs) return;
    this.version = theirs.version;
    this.base = partHashes(contentOf(theirs));
    // Unknown in the cheap form: send every part, so the result is exactly this copy.
    this.synced = null;
    this.conflict = null;
    this.failure = null;
    this.keptLocally = this.persistDraft(null);
    this.emit();
    this.save();
  }

  /** Conflict: drop this copy's changes and take the other device's. Returns what to show. */
  useTheirs(): ResumeContent | null {
    const theirs = this.conflict;
    if (!theirs) return null;
    this.acceptServer(theirs, contentOf(theirs));
    removeDraft(this.id, this.owner);
    this.emit();
    return this.local;
  }

  /** The resume is gone: forget its unsynced changes (they were saved elsewhere, or discarded). */
  discard() {
    window.clearTimeout(this.debounceTimer);
    window.clearTimeout(this.retryTimer);
    removeDraft(this.id);
    this.synced = this.localRaw;
    this.emit();
  }

  /** The current content, for "save as a new resume". */
  get content() {
    return this.local;
  }

  // --- Saving -----------------------------------------------------------------

  private dirty() {
    const s = this.synced;
    return !s || s.data !== this.localRaw.data || s.templateId !== this.localRaw.templateId || s.title !== this.localRaw.title;
  }

  private persistDraft(sending: { fromVersion: number; hash: string } | null): boolean {
    return writeDraft(
      this.id,
      {
        baseVersion: this.version,
        base: this.base,
        content: this.local,
        savedAt: Date.now(),
        sending,
        owner: this.owner,
      },
      this.localRaw.data,
    );
  }

  private scheduleSave(delay: number) {
    window.clearTimeout(this.debounceTimer);
    if (!this.attached) {
      // The editor has gone: no timers, send what is pending straight away.
      this.save();
      return;
    }
    this.debounceTimer = window.setTimeout(() => this.save(), delay);
  }

  private scheduleRetry(delay: number) {
    window.clearTimeout(this.retryTimer);
    if (!this.attached) return;
    this.retryTimer = window.setTimeout(() => this.save(), delay);
  }

  private save(options?: { keepalive?: boolean }) {
    if (this.inflight) {
      this.queued = true;
      return;
    }
    if (!this.dirty()) return;
    if (this.failure && BLOCKING.has(this.failure) && this.failure !== 'signedOut') return;
    window.clearTimeout(this.debounceTimer);
    window.clearTimeout(this.retryTimer);

    const content = this.local;
    const raw = this.localRaw;
    const synced = this.synced;
    const fromVersion = this.version;
    const changes: Parameters<typeof saveResume>[1] = { version: fromVersion };
    if (!synced || synced.data !== raw.data) changes.data = content.data;
    if (!synced || synced.templateId !== raw.templateId) changes.templateId = content.templateId;
    if (!synced || synced.title !== raw.title) changes.title = content.title;

    const hash = contentHash(content);
    this.lastSent = { fromVersion, hash, content };
    this.keptLocally = this.persistDraft({ fromVersion, hash });
    this.inflight = true;
    this.emit();

    saveResume(this.id, changes, options).then(
      (resume) => this.saved(resume, raw),
      (err) => this.failed(err),
    );
  }

  private saved(resume: SavedResume, sent: RawParts) {
    this.inflight = false;
    this.version = resume.version;
    this.base = partHashes(contentOf(resume));
    this.synced = sent;
    this.failure = null;
    this.error = null;
    this.errorStatus = null;
    this.conflict = null;
    this.retryDelay = FIRST_RETRY_MS;
    this.lastSavedAt = Date.now();
    this.afterAnswer();
  }

  private failed(err: unknown) {
    this.inflight = false;
    const status = err instanceof ApiError ? err.status : -1;
    if (status === 0) {
      this.failure = 'offline';
      this.scheduleRetry(OFFLINE_RETRY_MS);
    } else if (status === 401) {
      this.failure = 'signedOut';
    } else if (status === 404) {
      this.failure = 'gone';
    } else if (status === 409 && err instanceof ApiError && err.conflict) {
      this.resolveConflict(err.conflict);
    } else {
      this.failure = 'error';
      this.error = err instanceof Error ? err.message : 'Something went wrong.';
      this.errorStatus = status;
      this.scheduleRetry(this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS);
    }
    this.afterAnswer();
  }

  /** After any answer: keep the draft current, and send what changed meanwhile. */
  private afterAnswer() {
    const queued = this.queued;
    this.queued = false;
    if (this.dirty()) {
      this.keptLocally = this.persistDraft(null);
      if (!this.failure) this.scheduleSave(queued ? 0 : DEBOUNCE_MS);
    } else {
      removeDraft(this.id, this.owner);
      this.keptLocally = true;
    }
    this.emit();
  }

  /** 409: another copy reached the server first. Merge it if possible. */
  private resolveConflict(server: SavedResume) {
    const theirs = contentOf(server);
    const sent = this.lastSent;

    // Our own earlier save landed but its answer was lost: not a conflict.
    if (sent && server.version === sent.fromVersion + 1 && contentHash(theirs) === sent.hash) {
      this.version = server.version;
      this.base = partHashes(theirs);
      this.synced = sent.content ? rawParts(sent.content) : null;
      this.failure = null;
      return;
    }

    // Both sides hold the same thing: nothing to choose.
    if (sameContent(theirs, this.local)) {
      this.acceptServer(server, this.local);
      return;
    }

    const merged = this.base ? mergeContent(this.base, this.local, theirs) : null;
    if (merged) {
      this.version = server.version;
      this.base = partHashes(theirs);
      this.synced = rawParts(theirs);
      this.failure = null;
      if (!sameContent(merged, this.local)) {
        this.local = merged;
        this.localRaw = rawParts(merged);
        this.adoptListener?.(merged);
      }
      return;
    }

    this.failure = 'conflict';
    this.conflict = server;
  }

  /** Take the server's copy as the new starting point; `content` is what the editor holds. */
  private acceptServer(server: SavedResume, content: ResumeContent) {
    this.version = server.version;
    this.base = partHashes(contentOf(server));
    this.local = content;
    this.localRaw = rawParts(content);
    this.synced = this.localRaw;
    this.conflict = null;
    this.failure = null;
    this.error = null;
    this.lastSavedAt = Date.parse(server.updatedAt) || Date.now();
  }

  // --- The page ---------------------------------------------------------------

  private handleOnline = () => {
    if (this.failure === 'offline' || this.failure === 'error' || this.failure === 'signedOut') this.save();
  };

  private handleOffline = () => {
    // Say so at once if there are changes waiting, instead of after the next attempt.
    if (this.dirty() && !this.failure) {
      this.failure = 'offline';
      this.emit();
    }
  };

  private handleVisibility = () => {
    if (document.visibilityState === 'hidden') this.save({ keepalive: true });
    else if (this.failure === 'offline' || this.failure === 'error' || this.failure === 'signedOut') this.save();
  };

  private handlePageHide = () => {
    this.save({ keepalive: true });
  };

  private handleBeforeUnload = (e: BeforeUnloadEvent) => {
    // Only when leaving would lose something: changes not on the server and
    // not in this device's storage either.
    if (this.dirty() && !this.keptLocally) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  // --- State ------------------------------------------------------------------

  private compute(): SyncSnapshot {
    const dirty = this.dirty() || this.inflight;
    let status: SyncStatus;
    if (this.failure && BLOCKING.has(this.failure)) status = this.failure;
    else if (this.failure === 'offline') status = 'offline';
    else if (this.failure === 'error') status = 'error';
    else if (dirty) status = 'saving';
    else status = 'saved';
    return {
      status,
      dirty,
      keptLocally: this.keptLocally,
      conflict: this.conflict,
      error: this.error,
      errorStatus: this.errorStatus,
      lastSavedAt: this.lastSavedAt,
    };
  }

  private emit() {
    const next = this.compute();
    const prev = this.snapshot;
    if (
      prev.status === next.status &&
      prev.dirty === next.dirty &&
      prev.keptLocally === next.keptLocally &&
      prev.conflict === next.conflict &&
      prev.error === next.error &&
      prev.errorStatus === next.errorStatus &&
      prev.lastSavedAt === next.lastSavedAt
    ) {
      return;
    }
    this.snapshot = next;
    this.listeners.forEach((l) => l());
  }
}
