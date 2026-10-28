import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CircleAlert, CloudUpload, X } from 'lucide-react';
import { useSession } from '../../lib/authClient';
import { ApiError, createResume, type SavedResume } from '../../lib/resumesApi';
import { RESUME_STORAGE_KEY, normalizeResumeData } from '../../context/resumeStorage';
import { useResume } from '../../context/ResumeContext';
import { emptyResumeData, hasContent } from '../../data/emptyResume';
import { templates } from '../../data/templates';
import type { ResumeData } from '../../types/resume';
import { cn } from '../../utils/cn';

/**
 * Moves the resume a guest was working on in this browser into their account
 * the first time a session exists here, then clears the browser copy.
 *
 * - Once: a module-level set of handled users survives React StrictMode's
 *   double effects; a Web Lock serialises tabs, and each tab re-reads storage
 *   inside the lock, so a second tab finds nothing left to move.
 * - Never twice: before clearing, a marker records a fingerprint of what was
 *   uploaded. If that same resume turns up again (the clear failed, or a stale
 *   tab wrote it back), it is cleared, not uploaded again.
 * - Never lost: the browser copy is removed only after the upload succeeded,
 *   and only if it did not change while uploading.
 *
 * When a resume was moved, `GUEST_RESUME_IMPORTED_EVENT` fires on window with
 * `detail: { resume }`, so a list of saved resumes can refresh.
 */
export const GUEST_RESUME_IMPORTED_EVENT = 'paperplane:guest-resume-imported';
export type GuestResumeImportedDetail = { resume: SavedResume };

const MARKER_KEY = 'paperplane:guest-import';
const LOCK_NAME = 'paperplane:guest-import';
const LEASE_KEY = 'paperplane:guest-import-lease';

const handledUsers = new Set<string>();
let pending: Promise<void> = Promise.resolve();

/** Resolves once any import this page started has finished (immediately if none). */
export function guestImportSettled(): Promise<void> {
  return pending;
}

type Outcome =
  | { kind: 'none' }
  | { kind: 'imported'; resume: SavedResume; fingerprint: string }
  | { kind: 'cleared'; fingerprint: string }
  | { kind: 'failed'; message: string };

/** cyrb53: a fast, well-spread 53-bit string hash. Not for security; for "is this the same resume". */
function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** The same resume gives the same fingerprint, however it was serialised. */
function fingerprintOf(templateId: string | null, data: ResumeData): string {
  return hash(JSON.stringify({ t: templateId, d: normalizeResumeData(data) }));
}

function readMarker(): { fingerprint: string; userId: string } | null {
  try {
    const m = JSON.parse(window.localStorage.getItem(MARKER_KEY) ?? 'null');
    return m && typeof m.fingerprint === 'string' && typeof m.userId === 'string' ? m : null;
  } catch {
    return null;
  }
}

/** Runs `fn` while no other tab is importing. */
async function exclusively<T>(fn: () => Promise<T>, otherwise: T): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, fn);
  }
  // No Web Locks (old browsers): a short lease in storage. A tab that finds
  // another's fresh lease leaves the work to it.
  const me = Math.random().toString(36).slice(2);
  try {
    const lease = JSON.parse(window.localStorage.getItem(LEASE_KEY) ?? 'null');
    if (lease && Date.now() - lease.at < 30_000) return otherwise;
    window.localStorage.setItem(LEASE_KEY, JSON.stringify({ id: me, at: Date.now() }));
    if (JSON.parse(window.localStorage.getItem(LEASE_KEY) ?? 'null')?.id !== me) return otherwise;
  } catch {
    /* storage blocked: there is nothing to import either */
  }
  try {
    return await fn();
  } finally {
    try {
      window.localStorage.removeItem(LEASE_KEY);
    } catch {
      /* ignore */
    }
  }
}

function importGuestResume(userId: string): Promise<Outcome> {
  return exclusively<Outcome>(async () => {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(RESUME_STORAGE_KEY);
    } catch {
      return { kind: 'none' };
    }
    if (!raw) return { kind: 'none' };
    let stored: { v?: unknown; resumeData?: unknown; templateId?: unknown };
    try {
      stored = JSON.parse(raw);
    } catch {
      return { kind: 'none' };
    }
    if (stored?.v !== 1) return { kind: 'none' };
    const data = normalizeResumeData(stored.resumeData);
    if (!hasContent(data)) return { kind: 'none' };

    const savedTemplate = templates.find((t) => t.id === stored.templateId)?.id ?? null;
    const fingerprint = fingerprintOf(savedTemplate, data);
    const clearIfUnchanged = () => {
      try {
        if (window.localStorage.getItem(RESUME_STORAGE_KEY) === raw) window.localStorage.removeItem(RESUME_STORAGE_KEY);
      } catch {
        /* the marker still stops a second upload */
      }
    };

    const marker = readMarker();
    if (marker && marker.fingerprint === fingerprint && marker.userId === userId) {
      clearIfUnchanged();
      return { kind: 'cleared', fingerprint };
    }

    let resume: SavedResume;
    try {
      resume = await createResume({ templateId: savedTemplate ?? templates[0].id, data });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 401) return { kind: 'none' }; // signed out meanwhile: try again next sign-in
      const message =
        status === 0
          ? "You're offline. It's still saved in this browser, and we'll try again next time you open Paperplane."
          : `${e instanceof Error ? e.message : 'Something went wrong.'} It's still saved in this browser.`;
      return { kind: 'failed', message };
    }

    try {
      window.localStorage.setItem(MARKER_KEY, JSON.stringify({ fingerprint, userId, resumeId: resume.id, at: Date.now() }));
    } catch {
      /* best effort */
    }
    clearIfUnchanged();
    return { kind: 'imported', resume, fingerprint };
  }, { kind: 'none' });
}

type Toast = { kind: 'ok' } | { kind: 'error'; message: string };

export function GuestResumeImport() {
  const { data: session } = useSession();
  const userId = session?.user.id ?? null;
  const { resumeData, selectedTemplate, setResumeData, setSelectedTemplate } = useResume();
  const { pathname } = useLocation();
  const [toast, setToast] = useState<Toast | null>(null);

  // The editor's in-memory copy, read when an import finishes.
  const current = useRef({ resumeData, selectedTemplate });
  useEffect(() => {
    current.current = { resumeData, selectedTemplate };
  }, [resumeData, selectedTemplate]);

  /**
   * After a move, the app's in-memory guest resume is emptied too — otherwise
   * its next save would write the resume back. Only if it still is the
   * resume that was moved: never touch anything else being edited.
   */
  const forgetGuestCopy = useCallback(
    (fingerprint: string) => {
      const { resumeData: d, selectedTemplate: t } = current.current;
      if (fingerprintOf(t?.id ?? null, d) !== fingerprint) return;
      setResumeData(emptyResumeData());
      setSelectedTemplate(null);
    },
    [setResumeData, setSelectedTemplate],
  );

  const run = useCallback(
    (uid: string) => {
      let done = () => {};
      pending = new Promise<void>((resolve) => (done = resolve));
      importGuestResume(uid)
        .then((outcome) => {
          if (outcome.kind === 'imported' || outcome.kind === 'cleared') forgetGuestCopy(outcome.fingerprint);
          if (outcome.kind === 'imported') {
            setToast({ kind: 'ok' });
            window.dispatchEvent(
              new CustomEvent<GuestResumeImportedDetail>(GUEST_RESUME_IMPORTED_EVENT, { detail: { resume: outcome.resume } }),
            );
          } else if (outcome.kind === 'failed') {
            setToast({ kind: 'error', message: outcome.message });
          }
        })
        .finally(done);
    },
    [forgetGuestCopy],
  );

  useEffect(() => {
    if (!userId || handledUsers.has(userId)) return;
    handledUsers.add(userId);
    run(userId);
  }, [userId, run]);

  // Another tab moved the resume: empty this tab's copy too, so it is not written back.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== RESUME_STORAGE_KEY || e.newValue !== null) return;
      const marker = readMarker();
      if (marker) forgetGuestCopy(marker.fingerprint);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [forgetGuestCopy]);

  // A success note goes by itself; an error stays until dismissed.
  useEffect(() => {
    if (toast?.kind !== 'ok') return;
    const id = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
    >
      {toast && (
        <div
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border bg-white py-3 pr-2 pl-3 shadow-lift motion-safe:animate-rise',
            toast.kind === 'error' ? 'border-red-200' : 'border-slate-200/80',
          )}
        >
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
              toast.kind === 'error' ? 'bg-red-50 text-red-600 ring-red-200/70' : 'bg-mint-50 text-mint-700 ring-mint-200/70',
            )}
          >
            {toast.kind === 'error' ? (
              <CircleAlert className="size-[18px]" aria-hidden="true" />
            ) : (
              <CloudUpload className="size-[18px]" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1 py-0.5 text-sm leading-snug">
            {toast.kind === 'ok' ? (
              <>
                <p className="font-semibold text-ink-900">Your resume was saved to your account</p>
                <p className="mt-0.5 text-slate-600">The one you started in this browser is now with your other resumes.</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-ink-900">Couldn&rsquo;t move your resume into your account</p>
                <p className="mt-0.5 text-slate-600">{toast.message}</p>
              </>
            )}
            {toast.kind === 'ok' && pathname !== '/resumes' && (
              <Link to="/resumes" onClick={() => setToast(null)} className="mt-1.5 inline-flex min-h-8 items-center font-semibold text-aqua-800 hover:text-ink-900">
                View my resumes
              </Link>
            )}
            {toast.kind === 'error' && userId && (
              <button
                type="button"
                onClick={() => {
                  setToast(null);
                  run(userId);
                }}
                className="mt-1.5 inline-flex min-h-8 items-center font-semibold text-aqua-800 hover:text-ink-900"
              >
                Try again
              </button>
            )}
          </div>
          <button type="button" onClick={() => setToast(null)} className="btn-icon size-9 shrink-0 text-slate-500" aria-label="Dismiss">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
