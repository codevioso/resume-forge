import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CloudOff, Loader2, LogIn, Trash2, WifiOff } from 'lucide-react';
import type { SyncSnapshot } from '../resumes/resumeSync';
import { cn } from '../../utils/cn';

/**
 * Where a saved resume stands with the account: saving, saved, offline with
 * the changes kept on this device, failing (and retrying), or waiting for the
 * user (a conflict, a sign-in, a resume deleted elsewhere).
 *
 * One line, for under the title in the editor's headers. Problems are also
 * announced to screen readers; the routine "Saving…/Saved" churn is not.
 */
export function CloudSaveIndicator({
  sync,
  online,
  signInHref,
  compact = false,
  className,
}: {
  sync: SyncSnapshot;
  online: boolean;
  /** Where "Sign in to save" goes, back to this resume afterwards. */
  signInHref: string;
  /** Shorter wording, for the phone app bar. */
  compact?: boolean;
  className?: string;
}) {
  const { status } = sync;
  const tone = 'flex min-w-0 items-center gap-1.5 text-xs leading-4';
  let body;
  let announce = '';

  switch (status) {
    case 'saving':
      body = (
        <span className={cn(tone, 'text-slate-500')}>
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
          <span className="truncate">Saving…</span>
        </span>
      );
      break;
    case 'saved':
      body = (
        <span className={cn(tone, 'text-slate-500')} title="Every change is saved to your account. Open it on any device.">
          <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700" aria-hidden="true">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          <span className="truncate">Saved to your account</span>
          {!online && (
            <span className="ml-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200/70 px-1.5 py-px text-[11px] font-medium text-slate-600">
              <WifiOff className="size-3" aria-hidden="true" />
              Offline
            </span>
          )}
        </span>
      );
      break;
    case 'offline':
      announce = sync.keptLocally ? "Offline. Changes are kept on this device." : 'Offline and not saved. Keep this tab open.';
      body = sync.keptLocally ? (
        <span
          className={cn(tone, 'font-medium text-slate-600')}
          title="You're offline. Keep editing: your changes are kept on this device and saved to your account when you're back online."
        >
          <CloudOff className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{compact ? 'Offline — kept on this device' : 'Offline — changes kept on this device'}</span>
        </span>
      ) : (
        <span className={cn(tone, 'font-medium text-amber-700')} title="This browser refused to store your changes. Keep this tab open until you're back online.">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{compact ? 'Offline — keep this tab open' : 'Offline — not saved, keep this tab open'}</span>
        </span>
      );
      break;
    case 'error':
      announce = "Couldn't save. Retrying.";
      body = (
        <span
          className={cn(tone, 'font-medium text-amber-700')}
          title={`${sync.error ?? 'The server could not save your changes.'} Your changes are kept on this device meanwhile.`}
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Couldn't save — retrying</span>
        </span>
      );
      break;
    case 'conflict':
      announce = 'This resume was changed on another device.';
      body = (
        <span className={cn(tone, 'font-medium text-amber-700')}>
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Changed on another device</span>
        </span>
      );
      break;
    case 'signedOut':
      announce = 'You were signed out. Sign in to save.';
      body = (
        <Link
          to={signInHref}
          className={cn(tone, 'rounded font-semibold text-amber-700 underline-offset-2 hover:underline')}
          title="Your session ended. Your changes are kept on this device: sign in and they are saved."
        >
          <LogIn className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Signed out — sign in to save</span>
        </Link>
      );
      break;
    case 'gone':
      announce = 'This resume was deleted on another device.';
      body = (
        <span className={cn(tone, 'font-medium text-red-600')}>
          <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">Deleted on another device</span>
        </span>
      );
      break;
  }

  return (
    <span className={cn('flex min-w-0', className)} data-save-status={status}>
      {body}
      <span className="sr-only" role="status">
        {announce}
      </span>
    </span>
  );
}
