import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../editor/useEnvironment';

/** Phones get a bottom sheet; from `sm` up, a centred dialog. */
export const SHEET_QUERY = '(max-width: 639px)';

/** How many dialogs are open: the app behind stays inert until the last one closes. */
let openCount = 0;

/**
 * A modal: a centred dialog on larger screens, a bottom sheet on phones (the
 * way a native app asks a question).
 *
 * Rendered into <body>, with the app behind it made `inert`, so focus and
 * screen readers stay inside. Escape and a tap on the backdrop close it
 * unless `dismissible` is false (a decision the user must make). Focus moves
 * in on open — to `initialFocus`, or the first control — and back on close.
 */
export function Dialog({
  title,
  description,
  icon,
  children,
  footer,
  onClose,
  dismissible = true,
  size = 'sm',
  role = 'dialog',
  initialFocus,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** A small badge above the title (an icon in a tinted circle). */
  icon?: ReactNode;
  children?: ReactNode;
  /** The actions. Stacked full width on phones (the last one on top), in a row on the right above. */
  footer?: ReactNode;
  /** Required unless the dialog is not `dismissible`. */
  onClose?: () => void;
  dismissible?: boolean;
  size?: 'sm' | 'md' | 'lg';
  role?: 'dialog' | 'alertdialog';
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const isSheet = useMediaQuery(SHEET_QUERY);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The app behind: inert and not scrollable. Focus comes back on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById('root');
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    openCount += 1;
    if (root) root.inert = true;
    html.style.overflow = 'hidden';

    const target =
      initialFocus?.current ??
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close]), [href]') ??
      panelRef.current;
    target?.focus({ preventScroll: true });

    return () => {
      openCount -= 1;
      if (openCount === 0) {
        if (root) root.inert = false;
        html.style.overflow = previousOverflow;
      }
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const canClose = dismissible && !!onClose;
  useEffect(() => {
    if (!canClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [canClose]);

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' } as const;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] motion-safe:animate-fade-in"
        onClick={canClose ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100dvh-2rem)] w-full flex-col bg-white shadow-lift outline-none',
          isSheet
            ? 'max-h-[92dvh] rounded-t-[1.75rem] motion-safe:animate-sheet-up'
            : cn('rounded-3xl motion-safe:animate-rise', widths[size]),
          className,
        )}
      >
        {isSheet && <span className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />}
        {canClose && !isSheet && (
          <button
            type="button"
            data-close
            onClick={onClose}
            className="btn-icon absolute top-3 right-3 text-slate-500"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
        <div className={cn('min-h-0 overflow-y-auto overscroll-contain', isSheet ? 'px-5 pt-4' : 'px-7 pt-7')}>
          {icon && <div className="mb-4">{icon}</div>}
          <h2
            id={titleId}
            className={cn(
              'font-bold tracking-tight text-ink-900',
              isSheet ? 'text-xl leading-7' : 'pr-8 text-[22px] leading-7',
            )}
          >
            {title}
          </h2>
          {description && (
            <div id={descId} className="mt-2 text-[15px] leading-relaxed text-slate-600 sm:text-sm sm:leading-6">
              {description}
            </div>
          )}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {footer && (
          <div
            className={cn(
              'flex shrink-0 gap-2.5',
              isSheet ? 'flex-col-reverse px-5 pt-5 pb-safe-4 [&>*]:w-full [&>*]:min-h-12' : 'justify-end px-7 pt-6 pb-7',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** The tinted circle behind a dialog's icon. */
export function DialogIcon({ tone = 'ink', children }: { tone?: 'ink' | 'red' | 'amber' | 'aqua'; children: ReactNode }) {
  const tones = {
    ink: 'bg-ink-50 text-ink-800',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    aqua: 'bg-aqua-50 text-aqua-700',
  } as const;
  return <span className={cn('grid size-12 place-items-center rounded-2xl', tones[tone])}>{children}</span>;
}
