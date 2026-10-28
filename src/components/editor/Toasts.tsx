import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AlertCircle, CheckCircle2, Info, WifiOff, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastTone = 'success' | 'error' | 'offline' | 'info';

export type ToastInput = {
  tone: ToastTone;
  title: string;
  message?: string;
  /** How long it stays, in ms. Errors stay longer: they usually need reading. */
  duration?: number;
};

type Toast = ToastInput & { id: number };

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  offline: 7000,
  error: 8000,
};

/** At most this many on screen; the oldest goes first. */
const MAX_TOASTS = 3;

/**
 * Transient messages for the editor (export results, offline notices).
 *
 * State lives with the page that shows them; `<ToastViewport>` renders it.
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, number>());
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...input, id }].slice(-MAX_TOASTS));
      timers.current.set(
        id,
        window.setTimeout(() => dismissToast(id), input.duration ?? DEFAULT_DURATION[input.tone]),
      );
      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { toasts, showToast, dismissToast };
}

const toneIcon = {
  success: CheckCircle2,
  error: AlertCircle,
  offline: WifiOff,
  info: Info,
} satisfies Record<ToastTone, unknown>;

const toneIconClass: Record<ToastTone, string> = {
  success: 'text-mint-400',
  error: 'text-red-300',
  offline: 'text-aqua-300',
  info: 'text-aqua-300',
};

/**
 * Where toasts appear. `top-right` under the desktop header; `bottom` for
 * phones, centred above the tab bar (`style` sets the exact offset).
 *
 * The live region is always in the DOM, so screen readers announce a toast
 * when it is added. Errors use `role="alert"` to be announced at once.
 */
export function ToastViewport({
  toasts,
  onDismiss,
  placement,
  style,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  placement: 'top-right' | 'bottom';
  style?: CSSProperties;
}) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className={cn(
        'pointer-events-none fixed z-[60] flex flex-col gap-2',
        placement === 'top-right'
          ? 'top-20 right-6 w-[min(24rem,calc(100vw-3rem))] items-end'
          : 'inset-x-0 items-center px-4',
      )}
      style={style}
    >
      {toasts.map((toast) => {
        const Icon = toneIcon[toast.tone];
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-ink-900/95 py-3 pr-1.5 pl-4 text-white shadow-lift ring-1 ring-white/10 backdrop-blur',
              placement === 'top-right' ? 'animate-fade-in' : 'animate-rise',
            )}
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', toneIconClass[toast.tone])} aria-hidden="true" />
            <div className="min-w-0 flex-1 py-px">
              <p className="text-sm font-semibold leading-5">{toast.title}</p>
              {toast.message && <p className="mt-0.5 text-[13px] leading-5 text-ink-100/85">{toast.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
              className="-my-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-200 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
