import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudOff, FileQuestion, Loader2, RotateCw, ServerCrash, Trash2 } from 'lucide-react';
import { ResumeProvider, useResume } from '../../context/ResumeContext';
import { APP_NAME } from '../../constants/brand';
import { createResume, ApiError } from '../../lib/resumesApi';
import { BrandMark } from '../BrandMark';
import { AccountMenu } from '../account/AccountMenu';
import { CloudSaveIndicator } from '../editor/CloudSaveIndicator';
import { EditorWorkspace } from '../editor/EditorWorkspace';
import { useToasts } from '../editor/Toasts';
import { useMediaQuery, useOnlineStatus } from '../editor/useEnvironment';
import { ConflictDialog } from './ConflictDialog';
import { Dialog, DialogIcon } from './Dialog';
import { defaultTitle, type ResumeContent } from './drafts';
import { openSavedResume, type OpenResult } from './openResume';
import { cleanTitle } from './RenameDialog';
import type { ResumeSync } from './resumeSync';
import { templateFor } from './templateFor';

const signInHref = (path: string) => `/signin?next=${encodeURIComponent(path)}`;

/**
 * `/editor/:resumeId`: one of the signed-in user's saved resumes.
 *
 * Loads it (with any changes this device kept for it), then edits it in the
 * same workspace as the guest editor, inside its own ResumeProvider, with
 * every change saved to the account (ResumeSync).
 */
export function SavedResumeEditor({ resumeId }: { resumeId: string }) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<OpenResult | null>(null);
  const path = `/editor/${resumeId}`;

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    openSavedResume(resumeId).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [resumeId, attempt]);

  useEffect(() => {
    if (result?.kind === 'signedOut') navigate(signInHref(path), { replace: true });
  }, [result, navigate, path]);

  // Offline with nothing on the device: open it as soon as the connection is back.
  useEffect(() => {
    if (result?.kind !== 'offline') return;
    const retry = () => setAttempt((a) => a + 1);
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [result]);

  if (!result || result.kind === 'signedOut') return <EditorSkeleton />;

  if (result.kind === 'notFound') {
    return (
      <StatusScreen
        icon={<FileQuestion className="size-7" aria-hidden="true" />}
        title="We couldn't find this resume"
        message="It may have been deleted, or the link belongs to another account."
        actions={
          <Link to="/resumes" className="btn-primary btn-lg">
            <ArrowLeft className="size-5" aria-hidden="true" />
            Back to my resumes
          </Link>
        }
      />
    );
  }

  if (result.kind === 'offline' || result.kind === 'error') {
    const offline = result.kind === 'offline';
    return (
      <StatusScreen
        icon={
          offline ? <CloudOff className="size-7" aria-hidden="true" /> : <ServerCrash className="size-7" aria-hidden="true" />
        }
        title={offline ? "You're offline" : "This resume didn't load"}
        message={
          offline
            ? "Your resumes are saved in your account. This one opens as soon as you're back online."
            : result.message
        }
        actions={
          <>
            <Link to="/resumes" className="btn-secondary btn-lg">
              My resumes
            </Link>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="btn-primary btn-lg">
              <RotateCw className="size-5" aria-hidden="true" />
              Try again
            </button>
          </>
        }
      />
    );
  }

  return (
    <ResumeProvider
      key={attempt}
      initialResumeData={result.content.data}
      initialTemplate={templateFor(result.content.templateId)}
    >
      <SavedResumeSession sync={result.sync} initial={result.content} restored={result.restored} path={path} />
    </ResumeProvider>
  );
}

function SavedResumeSession({
  sync,
  initial,
  restored,
  path,
}: {
  sync: ResumeSync;
  initial: ResumeContent;
  restored: 'none' | 'draft' | 'offline';
  path: string;
}) {
  const navigate = useNavigate();
  const { resumeData, setResumeData, selectedTemplate, setSelectedTemplate } = useResume();
  const [title, setTitle] = useState(initial.title);
  const snapshot = useSyncExternalStore(sync.subscribe, sync.getSnapshot);
  const online = useOnlineStatus();
  const toastApi = useToasts();
  const { showToast } = toastApi;
  const isPhone = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    sync.attach();
    return () => sync.detach();
  }, [sync]);

  // Content taken from another device (a merge, or "Use the other version").
  const lastName = useRef(initial.data.personalInfo.fullName);
  const adopt = useCallback(
    (content: ResumeContent) => {
      lastName.current = content.data.personalInfo.fullName;
      setResumeData(content.data);
      setSelectedTemplate(templateFor(content.templateId));
      setTitle(content.title);
    },
    [setResumeData, setSelectedTemplate],
  );
  useEffect(() => {
    sync.onAdopt(adopt);
    return () => sync.onAdopt(null);
  }, [sync, adopt]);

  // A name the app gave ("Untitled resume", "Priya Raman's resume") follows
  // the person's name as it is typed; one the user chose stays.
  const fullName = resumeData.personalInfo.fullName;
  useEffect(() => {
    const previous = lastName.current;
    lastName.current = fullName;
    if (previous === fullName) return;
    setTitle((current) => (current === defaultTitle(previous) ? defaultTitle(fullName) : current));
  }, [fullName]);

  // Every change goes to the sync, which saves it.
  useEffect(() => {
    if (selectedTemplate) sync.update({ data: resumeData, templateId: selectedTemplate.id, title });
  }, [sync, resumeData, selectedTemplate, title]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} — ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  // Say once what was restored from the device.
  const told = useRef(false);
  useEffect(() => {
    if (told.current) return;
    told.current = true;
    if (restored === 'draft') {
      showToast({
        tone: 'info',
        title: 'Your unsaved changes are back',
        message: 'Changes kept on this device are restored and being saved to your account.',
      });
    } else if (restored === 'offline') {
      showToast({
        tone: 'offline',
        title: "You're offline",
        message: "Showing the changes kept on this device. They're saved to your account when you're back online.",
      });
    }
  }, [restored, showToast]);

  // The server refusing this content (a 4xx: too long, too large) will not
  // fix itself by retrying, so say why, once. A server fault or a lost
  // connection only needs the status line: it retries by itself.
  const told400 = useRef<string | null>(null);
  useEffect(() => {
    const refused = snapshot.status === 'error' && (snapshot.errorStatus ?? 0) >= 400 && (snapshot.errorStatus ?? 0) < 500;
    if (!refused) {
      told400.current = null;
      return;
    }
    if (told400.current === snapshot.error) return;
    told400.current = snapshot.error;
    showToast({
      tone: 'error',
      title: "Couldn't save your changes",
      message: `${snapshot.error ?? 'The server refused them.'} They're kept on this device until this is fixed.`,
    });
  }, [snapshot.status, snapshot.error, snapshot.errorStatus, showToast]);

  const rename = useCallback((next: string) => {
    const clean = cleanTitle(next);
    if (clean) setTitle(clean);
  }, []);

  const saveNow = useCallback(() => sync.saveNow(), [sync]);

  const keepMine = () => {
    sync.keepMine();
    showToast({ tone: 'success', title: 'Kept your version', message: 'It replaces the copy from the other device.' });
  };
  const useTheirs = () => {
    const content = sync.useTheirs();
    if (content) adopt(content);
    showToast({ tone: 'info', title: 'Switched to the other version' });
  };

  const current: ResumeContent = { data: resumeData, templateId: selectedTemplate?.id ?? initial.templateId, title };

  return (
    <EditorWorkspace
      renderStatus={() => (
        <CloudSaveIndicator sync={snapshot} online={online} signInHref={signInHref(path)} compact={isPhone} />
      )}
      offlineExportMessage="Your changes are kept on this device. Export the PDF when you're back online."
      onBack={() => navigate('/resumes')}
      backLabel="Back to my resumes"
      backText="My resumes"
      title={{ value: title, onRename: rename }}
      galleryLink={false}
      onSaveShortcut={saveNow}
      toastApi={toastApi}
    >
      {snapshot.status === 'conflict' && snapshot.conflict && (
        <ConflictDialog mine={current} theirs={snapshot.conflict} onKeepMine={keepMine} onUseTheirs={useTheirs} />
      )}
      {snapshot.status === 'gone' && <DeletedDialog sync={sync} current={current} />}
    </EditorWorkspace>
  );
}

/** The resume was deleted elsewhere while open here: keep the work as a new resume, or let it go. */
function DeletedDialog({ sync, current }: { sync: ResumeSync; current: ResumeContent }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAsNew = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createResume({ templateId: current.templateId, data: current.data, title: current.title });
      sync.discard();
      navigate(`/editor/${created.id}`, { replace: true });
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  const discard = () => {
    sync.discard();
    navigate('/resumes', { replace: true });
  };

  return (
    <Dialog
      role="alertdialog"
      dismissible={false}
      icon={
        <DialogIcon tone="red">
          <Trash2 className="size-6" aria-hidden="true" />
        </DialogIcon>
      }
      title="This resume was deleted"
      description="It was deleted from your account, probably on another device. Keep what you have here as a new resume, or let it go."
      footer={
        <>
          <button type="button" onClick={discard} disabled={busy} className="btn-secondary">
            Discard
          </button>
          <button type="button" onClick={saveAsNew} disabled={busy} className="btn-primary" data-autofocus>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Save as a new resume
          </button>
        </>
      }
    >
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

/** A full page with one message: not found, offline, failed. */
function StatusScreen({
  icon,
  title,
  message,
  actions,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  actions: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="pt-safe border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 md:h-16 md:px-6">
          <Link to="/" aria-label={`${APP_NAME} home`} className="flex min-h-11 items-center rounded-lg px-1">
            <BrandMark variant="compact" className="md:hidden" />
            <BrandMark className="hidden h-9 md:block" />
          </Link>
          <AccountMenu />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center motion-safe:animate-rise">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-ink-700 shadow-soft ring-1 ring-slate-200">
            {icon}
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{message}</p>
          <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">{actions}</div>
        </div>
      </main>
    </div>
  );
}

/** The editor's shape while the resume loads, so nothing jumps when it arrives. */
function EditorSkeleton() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const bar = 'rounded-full bg-slate-200/80';
  const formCards = (
    <div className="space-y-3">
      <div className={`${bar} h-6 w-40`} />
      <div className={`${bar} h-4 w-64`} />
      <div className="flex gap-2 pt-2">
        <div className="h-11 w-32 rounded-xl bg-slate-200/70" />
        <div className="h-11 w-24 rounded-xl bg-slate-200/50" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex h-[72px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4">
          <div className="size-10 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className={`${bar} h-3.5 w-32`} />
            <div className={`${bar} h-3 w-48 bg-slate-100`} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-slate-100" aria-busy="true" aria-label="Loading your resume">
      <span className="sr-only" role="status">
        Loading your resume…
      </span>
      {isDesktop ? (
        <>
          <div className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5 xl:px-6">
            <div className="size-9 rounded-xl bg-slate-100" />
            <span className="h-6 w-px bg-slate-200" />
            <div className="space-y-2">
              <div className={`${bar} h-4 w-44`} />
              <div className={`${bar} h-3 w-32 bg-slate-100`} />
            </div>
            <div className="ml-auto flex gap-2.5">
              <div className="h-11 w-40 rounded-xl bg-slate-100" />
              <div className="h-11 w-44 rounded-xl bg-slate-100" />
              <div className="h-11 w-36 rounded-xl bg-slate-200" />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 animate-pulse">
            <div className="w-[480px] shrink-0 border-r border-slate-200 bg-slate-50 px-6 pt-6 xl:w-[540px]">{formCards}</div>
            <div className="flex flex-1 justify-center px-10 pt-8">
              <div className="aspect-[210/297] h-[calc(100%+4rem)] max-h-[1123px] rounded-[3px] bg-white shadow-soft" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="pt-safe border-b border-slate-200/80 bg-white">
            <div className="flex h-14 items-center gap-3 px-3">
              <div className="size-8 rounded-lg bg-slate-100" />
              <div className="flex-1 space-y-1.5">
                <div className={`${bar} h-4 w-36`} />
                <div className={`${bar} h-3 w-24 bg-slate-100`} />
              </div>
              <div className="h-9 w-16 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="flex-1 animate-pulse bg-slate-50 px-4 pt-4">{formCards}</div>
        </>
      )}
    </div>
  );
}
