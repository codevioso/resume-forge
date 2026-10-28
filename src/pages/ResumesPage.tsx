import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CloudOff, Loader2, Plus, RotateCw, ServerCrash, Trash2 } from 'lucide-react';
import { APP_NAME } from '../constants/brand';
import { BrandMark, PlaneMark } from '../components/BrandMark';
import { AccountMenu } from '../components/account/AccountMenu';
import {
  GUEST_RESUME_IMPORTED_EVENT,
  guestImportSettled,
  type GuestResumeImportedDetail,
} from '../components/account/GuestResumeImport';
import { ToastViewport, useToasts } from '../components/editor/Toasts';
import { useMediaQuery } from '../components/editor/useEnvironment';
import { Dialog, DialogIcon } from '../components/resumes/Dialog';
import { draftIds, removeDraft } from '../components/resumes/drafts';
import { RenameDialog } from '../components/resumes/RenameDialog';
import { ResumeCard, ResumeCardSkeleton } from '../components/resumes/ResumeCard';
import type { ResumeAction } from '../components/resumes/ResumeActions';
import { useNow } from '../components/resumes/time';
import {
  ApiError,
  deleteResume,
  duplicateResume,
  listResumes,
  saveResume,
  settleSaves,
  type SavedResume,
} from '../lib/resumesApi';
import { useSession } from '../lib/authClient';
import { cn } from '../utils/cn';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; resumes: SavedResume[]; limit: number }
  | { kind: 'offline' }
  | { kind: 'error'; message: string };

const NEW_RESUME_PATH = '/templates?new=1';
const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6 2xl:grid-cols-5';

/**
 * "My resumes": every resume saved to the signed-in user's account, newest
 * first, each one a real render of its first page. Open, rename, duplicate,
 * delete, or start a new one from the template gallery.
 */
export function ResumesPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [renaming, setRenaming] = useState<SavedResume | null>(null);
  const [deleting, setDeleting] = useState<SavedResume | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [unsynced, setUnsynced] = useState<Set<string>>(() => draftIds());
  const now = useNow();
  const isPhone = useMediaQuery('(max-width: 767px)');
  const { toasts, showToast, dismissToast } = useToasts();

  const load = useCallback(
    async (quiet: boolean) => {
      if (!quiet) setState((s) => (s.kind === 'ready' ? s : { kind: 'loading' }));
      // A save from the editor just left may still be on its way, and on a
      // first sign-in the browser's guest resume may still be uploading. (One
      // tick first: the upload starts in an effect of the same render that
      // learned the session.)
      await Promise.resolve();
      await Promise.all([settleSaves(), guestImportSettled()]);
      try {
        const { resumes, limit } = await listResumes();
        setState({ kind: 'ready', resumes, limit });
        setUnsynced(draftIds());
      } catch (err) {
        const status = err instanceof ApiError ? err.status : -1;
        if (status === 401) {
          navigate(`/signin?next=${encodeURIComponent('/resumes')}`, { replace: true });
        } else if (quiet) {
          // A background refresh failing changes nothing on screen.
        } else if (status === 0) {
          setState({ kind: 'offline' });
        } else {
          setState({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' });
        }
      }
    },
    [navigate],
  );

  // The first load waits until the session is known, so a guest resume being
  // moved into the account on this sign-in is in the list (not "0 of 50").
  const { isPending: sessionPending } = useSession();
  const [sessionKnown, setSessionKnown] = useState(!sessionPending);
  useEffect(() => {
    if (!sessionPending) setSessionKnown(true);
  }, [sessionPending]);

  useEffect(() => {
    if (sessionKnown) void load(false);
  }, [load, attempt, sessionKnown]);

  // Back online, or back to this tab: show what changed meanwhile (maybe on another device).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void load(state.kind === 'ready');
    };
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load, state.kind]);

  // The guest resume moved into the account (sign-in finished after this page loaded): show it.
  useEffect(() => {
    const onImported = (e: Event) => {
      const { resume } = (e as CustomEvent<GuestResumeImportedDetail>).detail;
      setState((s) =>
        s.kind === 'ready' && !s.resumes.some((r) => r.id === resume.id) ? { ...s, resumes: [resume, ...s.resumes] } : s,
      );
      setHighlightId(resume.id);
      void load(true);
    };
    window.addEventListener(GUEST_RESUME_IMPORTED_EVENT, onImported);
    return () => window.removeEventListener(GUEST_RESUME_IMPORTED_EVENT, onImported);
  }, [load]);

  useEffect(() => {
    const previous = document.title;
    document.title = `My resumes — ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, []);

  // Phones: the app bar shows the page title once the big one scrolls away.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const resumes = state.kind === 'ready' ? state.resumes : [];
  const limit = state.kind === 'ready' ? state.limit : null;
  const atLimit = limit !== null && resumes.length >= limit;

  const replace = (resume: SavedResume) =>
    setState((s) =>
      s.kind === 'ready' ? { ...s, resumes: s.resumes.map((r) => (r.id === resume.id ? resume : r)) } : s,
    );

  const failed = (title: string, err: unknown) => {
    const status = err instanceof ApiError ? err.status : -1;
    if (status === 401) {
      navigate(`/signin?next=${encodeURIComponent('/resumes')}`, { replace: true });
      return;
    }
    showToast({
      tone: status === 0 ? 'offline' : 'error',
      title,
      message: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    });
  };

  const rename = async (resume: SavedResume, title: string) => {
    replace({ ...resume, title });
    try {
      let saved: SavedResume;
      try {
        saved = await saveResume(resume.id, { version: resume.version, title });
      } catch (err) {
        // Edited elsewhere since this list loaded: a rename touches only the name, so apply it on top.
        if (!(err instanceof ApiError && err.status === 409 && err.conflict)) throw err;
        saved = await saveResume(resume.id, { version: err.conflict.version, title });
      }
      replace(saved);
    } catch (err) {
      replace(resume);
      failed("Couldn't rename the resume", err);
      throw err;
    }
  };

  const duplicate = async (resume: SavedResume) => {
    try {
      const copy = await duplicateResume(resume.id);
      setState((s) => (s.kind === 'ready' ? { ...s, resumes: [copy, ...s.resumes] } : s));
      setHighlightId(copy.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast({ tone: 'success', title: 'Duplicated', message: `“${copy.title}” is at the top of your list.` });
    } catch (err) {
      failed("Couldn't duplicate the resume", err);
    }
  };

  const remove = async (resume: SavedResume) => {
    try {
      await deleteResume(resume.id);
    } catch (err) {
      // Already gone (deleted on another device): that is what the user wanted.
      if (!(err instanceof ApiError && err.status === 404)) {
        failed("Couldn't delete the resume", err);
        throw err;
      }
    }
    removeDraft(resume.id);
    setState((s) => (s.kind === 'ready' ? { ...s, resumes: s.resumes.filter((r) => r.id !== resume.id) } : s));
    showToast({ tone: 'success', title: 'Resume deleted', message: `“${resume.title}” was deleted from your account.` });
  };

  const act = (resume: SavedResume) => (action: ResumeAction) => {
    if (action === 'open') navigate(`/editor/${resume.id}`);
    else if (action === 'rename') setRenaming(resume);
    else if (action === 'duplicate') void duplicate(resume);
    else setDeleting(resume);
  };

  const newResume = () => navigate(NEW_RESUME_PATH);
  const showFab = isPhone && state.kind === 'ready' && resumes.length > 0;

  let body: ReactNode;
  if (state.kind === 'loading') {
    body = (
      <ul className={cn(GRID, 'animate-pulse')} aria-hidden="true">
        {Array.from({ length: isPhone ? 4 : 5 }, (_, i) => (
          <li key={i}>
            <ResumeCardSkeleton />
          </li>
        ))}
      </ul>
    );
  } else if (state.kind === 'offline' || state.kind === 'error') {
    const offline = state.kind === 'offline';
    body = (
      <Notice
        icon={offline ? <CloudOff className="size-7" aria-hidden="true" /> : <ServerCrash className="size-7" aria-hidden="true" />}
        title={offline ? "You're offline" : "Your resumes didn't load"}
        message={
          offline
            ? "Your resumes are safe in your account. They'll appear here as soon as you're back online."
            : state.message
        }
        action={
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className="btn-primary btn-lg">
            <RotateCw className="size-5" aria-hidden="true" />
            Try again
          </button>
        }
      />
    );
  } else if (resumes.length === 0) {
    body = <EmptyState onCreate={newResume} />;
  } else {
    body = (
      <ul className={GRID} aria-label="Your resumes">
        {resumes.map((resume) => (
          // Raised while its menu is open, so the menu paints over the next row.
          <li key={resume.id} className="relative motion-safe:animate-fade-in has-[[aria-expanded=true]]:z-20">
            <ResumeCard
              resume={resume}
              now={now}
              unsynced={unsynced.has(resume.id)}
              highlight={resume.id === highlightId}
              onAction={act(resume)}
              canDuplicate={!atLimit}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="pt-safe sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-2 md:h-16 md:px-6 lg:px-8">
          <Link
            to="/"
            aria-label={`${APP_NAME} home`}
            className={cn('flex min-h-11 shrink-0 items-center rounded-lg px-2 transition md:px-0', condensed && 'max-md:opacity-0')}
            tabIndex={condensed && isPhone ? -1 : undefined}
          >
            <BrandMark variant="compact" className="md:hidden" />
            <BrandMark className="hidden h-9 md:block" />
          </Link>
          {/* Phones: the title, once the big one has scrolled away. */}
          <span
            className={cn(
              'pointer-events-none absolute inset-x-16 truncate text-center text-[15px] font-semibold text-ink-900 transition duration-200 md:hidden',
              condensed ? 'opacity-100' : 'translate-y-1 opacity-0',
            )}
            aria-hidden="true"
          >
            My resumes
          </span>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            {state.kind === 'ready' && (
              <button
                type="button"
                onClick={newResume}
                disabled={atLimit}
                className="btn-primary hidden pr-4 md:inline-flex"
              >
                <Plus className="size-4" aria-hidden="true" />
                New resume
              </button>
            )}
            <AccountMenu compact={isPhone} />
          </div>
        </div>
      </header>

      <main className={cn('mx-auto max-w-7xl px-4 md:px-6 lg:px-8', showFab ? 'pb-32' : 'pb-16')}>
        <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-6 pb-5 md:pt-12 md:pb-8">
          <div className="min-w-0">
            <h1
              ref={headingRef}
              className="text-[28px] leading-[1.15] font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-[2.75rem]"
            >
              My resumes
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-slate-600 sm:text-base">
              {state.kind === 'ready' ? (
                <span
                  className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold text-ink-800 tabular-nums ring-1 ring-slate-200"
                  data-resume-count
                >
                  {resumes.length} of {limit}
                  <span className="sr-only"> resumes</span>
                </span>
              ) : (
                state.kind === 'loading' && <span className="h-6 w-16 animate-pulse rounded-full bg-slate-200/80" />
              )}
              <span>Saved to your account — open and edit them on any device.</span>
            </p>
          </div>
        </section>

        {atLimit && (
          <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You've reached the limit of {limit} resumes. Delete one to make room for a new one.
          </p>
        )}

        {body}
      </main>

      {showFab && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent px-4 pt-10 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <button
            type="button"
            onClick={newResume}
            disabled={atLimit}
            className="btn-primary btn-lg pointer-events-auto rounded-full px-7 shadow-lift"
          >
            <Plus className="size-5" aria-hidden="true" />
            New resume
          </button>
        </div>
      )}

      <ToastViewport
        toasts={toasts}
        onDismiss={dismissToast}
        placement={isPhone ? 'bottom' : 'top-right'}
        style={isPhone ? { bottom: showFab ? 'calc(env(safe-area-inset-bottom) + 5.5rem)' : 'calc(env(safe-area-inset-bottom) + 1rem)' } : undefined}
      />

      {renaming && (
        <RenameDialog
          title={renaming.title}
          onRename={(title) => rename(renaming, title)}
          onClose={() => setRenaming(null)}
        />
      )}
      {deleting && <DeleteDialog resume={deleting} onDelete={() => remove(deleting)} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function DeleteDialog({
  resume,
  onDelete,
  onClose,
}: {
  resume: SavedResume;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setBusy(false);
    }
  };
  return (
    <Dialog
      role="alertdialog"
      onClose={busy ? undefined : onClose}
      icon={
        <DialogIcon tone="red">
          <Trash2 className="size-6" aria-hidden="true" />
        </DialogIcon>
      }
      title={<>Delete “{resume.title}”?</>}
      description="It's deleted from your account on every device. This can't be undone."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary" data-autofocus>
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="btn min-w-28 bg-red-600 text-white shadow-soft hover:bg-red-700"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-label="Deleting" /> : 'Delete'}
          </button>
        </>
      }
    />
  );
}

function Notice({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center motion-safe:animate-rise md:py-16" role="status">
      <span className="grid size-16 place-items-center rounded-2xl bg-white text-ink-700 shadow-soft ring-1 ring-slate-200">
        {icon}
      </span>
      <h2 className="mt-6 text-xl font-bold tracking-tight text-ink-900">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{message}</p>
      <div className="mt-7">{action}</div>
    </div>
  );
}

/** No resumes yet: a stack of blank pages, and the way to start. */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  const line = 'h-1.5 rounded-full bg-slate-200';
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-2 pt-4 pb-10 text-center motion-safe:animate-rise md:pt-8">
      <div className="relative h-48 w-56" aria-hidden="true">
        <div className="absolute top-6 left-6 h-40 w-32 -rotate-6 rounded-lg bg-white shadow-soft ring-1 ring-slate-900/5" />
        <div className="absolute top-3 left-16 flex h-40 w-32 rotate-3 flex-col gap-2 rounded-lg bg-white p-4 shadow-lift ring-1 ring-slate-900/5">
          <div className="mb-1 size-7 rounded-full bg-aqua-100" />
          <div className={cn(line, 'w-16 bg-ink-200')} />
          <div className={cn(line, 'w-12')} />
          <div className={cn(line, 'mt-2 w-full')} />
          <div className={cn(line, 'w-5/6')} />
          <div className={cn(line, 'w-full')} />
          <div className={cn(line, 'w-2/3')} />
        </div>
        <PlaneMark className="absolute -top-1 right-0 h-10 -rotate-6 drop-shadow-sm" />
      </div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink-900">Create your first resume</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        Pick a design and fill it in. It's saved to your account as you type, so you can come back and edit it any time,
        from any device.
      </p>
      <button type="button" onClick={onCreate} className="btn-primary btn-lg mt-7">
        <Plus className="size-5" aria-hidden="true" />
        Choose a template
      </button>
    </div>
  );
}
