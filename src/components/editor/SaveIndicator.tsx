import { AlertTriangle, Check, WifiOff } from 'lucide-react';
import type { SaveStatus } from '../../context/ResumeContext';
import { cn } from '../../utils/cn';

const SAVED_HINT = 'Your resume is kept in this browser only. It is not uploaded anywhere until you export a PDF.';
const FAILED_HINT =
  'The browser refused to store the resume (storage full, or disabled in private mode). Export a PDF before closing this tab.';

/**
 * Where the resume stands: saved in this browser, or not saved at all.
 * `size="sm"` is the one-line subtitle under the phone app bar's title.
 */
export function SaveIndicator({
  status,
  online,
  size = 'md',
  className,
}: {
  status: SaveStatus;
  online: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const small = size === 'sm';
  if (status === 'off') return null;

  return (
    <span className={cn('flex min-w-0 items-center', small ? 'gap-1.5 text-xs' : 'gap-2 text-sm', className)}>
      {status === 'saved' ? (
        <span className="flex min-w-0 items-center gap-1.5 text-slate-500" title={SAVED_HINT}>
          <span
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700',
              small ? 'size-3.5' : 'size-[18px]',
            )}
            aria-hidden="true"
          >
            <Check className={small ? 'size-2.5' : 'size-3'} strokeWidth={3} />
          </span>
          <span className="truncate">Saved in this browser</span>
        </span>
      ) : (
        <span
          className={cn(
            'flex min-w-0 items-center gap-1.5 font-medium text-amber-700',
            !small && 'rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1',
          )}
          title={FAILED_HINT}
        >
          <AlertTriangle className={cn('shrink-0', small ? 'size-3' : 'size-3.5')} aria-hidden="true" />
          <span className="truncate">Not saved — export before closing</span>
        </span>
      )}
      {!online && (
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-200/70 font-medium text-slate-600',
            small ? 'px-1.5 py-px text-[11px]' : 'px-2 py-0.5 text-xs',
          )}
          title="You are offline. Editing still works; exporting a PDF needs a connection."
        >
          <WifiOff className="size-3" aria-hidden="true" />
          Offline
        </span>
      )}
    </span>
  );
}
