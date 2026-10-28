import { forwardRef, useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, CircleAlert, CircleCheck, Files, Info, LoaderCircle, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { BrandMark, PlaneMark } from '../BrandMark';
import { APP_NAME } from '../../constants/brand';
import { cn } from '../../utils/cn';

/**
 * The frame of every sign-in page.
 *
 * Desktop: the form on the right, a brand panel on the left with what an
 * account is for. Tablets: the form on a card. Phones: a full-screen app page
 * — back button and brand in an app bar, the form, and the switch to the
 * other page ("New here? Create an account") at the bottom.
 */
export function AuthLayout({
  title,
  description,
  icon,
  children,
  footer,
  backTo = '/',
}: {
  title: ReactNode;
  description?: ReactNode;
  /** A large icon above the title (status pages: check your email, link expired). */
  icon?: ReactNode;
  children: ReactNode;
  /** Below the form: the switch to the other page. */
  footer?: ReactNode;
  /** Where Back goes when there is no page to go back to. */
  backTo?: string;
}) {
  const navigate = useNavigate();
  const goBack = () => {
    // React Router counts entries it created; 0 means this page opened the tab.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(backTo);
  };

  return (
    <div className="min-h-dvh bg-white sm:bg-slate-50 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:bg-white lg:p-3">
      <BrandPanel />

      <div className="relative isolate flex min-h-dvh flex-col lg:min-h-0">
        {/* Tablet backdrop: the hero's light, so the card does not float on flat grey. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden sm:block lg:hidden">
          <div className="absolute inset-0 bg-[radial-gradient(40rem_26rem_at_90%_-10%,var(--color-aqua-100),transparent_65%),radial-gradient(34rem_24rem_at_-10%_0%,var(--color-mint-50),transparent_70%)]" />
        </div>

        <header className="pt-safe sticky top-0 z-20 bg-white/85 backdrop-blur-xl sm:static sm:bg-transparent sm:backdrop-blur-none">
          <div className="flex h-14 items-center gap-1 px-1.5 sm:h-16 sm:px-4 lg:px-6">
            <button type="button" onClick={goBack} className="btn-icon shrink-0 sm:hidden" aria-label="Back">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={goBack} className="btn-ghost hidden px-3 text-slate-600 sm:inline-flex">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </button>
            <div className="flex flex-1 justify-center lg:hidden">
              <Link to="/" aria-label={`${APP_NAME} home`} className="flex min-h-11 items-center rounded-lg px-2">
                <BrandMark variant="compact" />
              </Link>
            </div>
            {/* Balances the back button so the brand is centred. */}
            <span className="size-11 shrink-0 sm:w-[5.25rem] lg:hidden" aria-hidden="true" />
          </div>
        </header>

        <main className="pb-safe-4 flex flex-1 flex-col px-4 sm:items-center sm:justify-center sm:px-6 sm:pt-4 sm:pb-12 lg:pb-16">
          <div className="w-full pt-4 sm:max-w-[28rem] sm:rounded-[1.75rem] sm:border sm:border-slate-200/80 sm:bg-white sm:p-9 sm:pt-9 sm:shadow-soft lg:max-w-[25.5rem] lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none">
            {icon && <div className="mb-6">{icon}</div>}
            <h1 className="text-[1.75rem] leading-[1.15] font-extrabold tracking-[-0.03em] text-balance text-ink-900 sm:text-[2rem]">
              {title}
            </h1>
            {description && (
              <div className="mt-2.5 text-[0.9375rem] leading-relaxed text-pretty text-slate-600">{description}</div>
            )}
            <div className="mt-7">{children}</div>
          </div>
          {footer && (
            <div className="mt-auto pt-10 text-center text-[0.9375rem] text-slate-600 sm:mt-6 sm:pt-0">{footer}</div>
          )}
        </main>
      </div>
    </div>
  );
}

const BENEFITS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Files, title: 'Keep several resumes', body: 'One for each kind of role, all in one place.' },
  { icon: MonitorSmartphone, title: 'On all your devices', body: 'Start on your laptop, finish on your phone.' },
  { icon: ShieldCheck, title: 'Yours to delete', body: 'Delete your account, and every resume in it, any time.' },
];

/** Desktop only: the brand, and what an account is for. */
function BrandPanel() {
  return (
    <aside className="relative isolate hidden overflow-hidden rounded-[1.75rem] bg-ink-900 text-white lg:sticky lg:top-3 lg:flex lg:h-[calc(100dvh-1.5rem)] lg:flex-col lg:p-10 xl:p-14">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-32 size-[30rem] rounded-full bg-aqua-400/20 blur-3xl" />
        <div className="absolute -bottom-44 -left-32 size-[28rem] rounded-full bg-mint-400/15 blur-3xl" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)] bg-[radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1.2px)] [background-size:22px_22px]" />
      </div>

      <Link to="/" aria-label={`${APP_NAME} home`} className="flex w-fit items-center gap-2.5 rounded-lg">
        <PlaneMark className="h-7" />
        <span className="text-xl font-extrabold tracking-tight">{APP_NAME}</span>
      </Link>

      {/* The plane, trailing dots back across the panel. */}
      <div aria-hidden="true" className="pointer-events-none absolute top-[13%] right-[9%] h-28 w-[62%]">
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-0 size-full text-aqua-400/60" fill="none">
          <path
            d="M 0 116 C 120 118, 230 70, 372 18"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="0.5 10"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <PlaneMark className="absolute -top-5 -right-6 h-12 drop-shadow-[0_8px_18px_rgb(14_240_248/0.3)]" />
      </div>

      <div className="my-auto max-w-md pt-24">
        <p className="text-xs font-semibold tracking-[0.14em] text-aqua-300 uppercase">Free account</p>
        <h2 className="mt-3 text-[2.5rem] leading-[1.06] font-extrabold tracking-[-0.035em] text-balance xl:text-5xl">
          Your resumes, on every device.
        </h2>
        <ul className="mt-9 space-y-5">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-aqua-300 ring-1 ring-white/10 ring-inset">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="pt-0.5">
                <span className="block font-semibold">{title}</span>
                <span className="mt-0.5 block text-[0.9375rem] leading-relaxed text-ink-200">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm leading-relaxed text-ink-200">
        No account needed to build and download a resume.{' '}
        <Link to="/templates" className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
          Continue without one
        </Link>
      </p>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Building blocks for the forms.

const ALERT_TONES = {
  error: { box: 'border-red-200 bg-red-50 text-red-800', icon: CircleAlert, iconClass: 'text-red-600' },
  info: { box: 'border-aqua-200 bg-aqua-50 text-ink-800', icon: Info, iconClass: 'text-aqua-700' },
  success: { box: 'border-mint-200 bg-mint-50 text-ink-800', icon: CircleCheck, iconClass: 'text-mint-700' },
} as const;

/**
 * A message above a form. Errors are announced as alerts; info and success
 * politely. `focus` moves focus to it, for messages that replace the form's
 * purpose (so a screen reader hears them first).
 */
export function AuthAlert({
  tone,
  children,
  className,
  focus = false,
}: {
  tone: keyof typeof ALERT_TONES;
  children: ReactNode;
  className?: string;
  focus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus();
  }, [focus]);
  const t = ALERT_TONES[tone];
  return (
    <div
      ref={ref}
      tabIndex={focus ? -1 : undefined}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-relaxed outline-none motion-safe:animate-fade-in', t.box, className)}
    >
      <t.icon className={cn('mt-0.5 size-[18px] shrink-0', t.iconClass)} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** "or" between the Google button and the email form. */
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4 text-xs font-medium tracking-wide text-slate-500 uppercase" role="separator">
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
      or
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-5 animate-spin motion-reduce:animate-none', className)} aria-hidden="true" />;
}

/** The form's main button: full width, large, and a spinner while the request runs. */
export function SubmitButton({
  busy,
  busyLabel,
  children,
  disabled,
  className,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type="submit" className={cn('btn-primary btn-lg w-full', className)} disabled={busy || disabled} aria-disabled={busy || disabled}>
      {busy ? (
        <>
          <Spinner />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  /** Something on the label's line, right-aligned (e.g. "Forgot password?"). */
  labelAside?: ReactNode;
};

/** A labelled input with its hint or error wired up for screen readers. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { id, label, error, hint, labelAside, className, ...input },
  ref,
) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {labelAside}
      </div>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn('field-input min-h-12', error && 'border-red-400 hover:border-red-500 focus:border-red-500 focus:ring-red-100')}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-red-700">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/** The large icon above a status page's title (check your email, link expired). */
export function StatusIcon({ icon: Icon, tone = 'aqua' }: { icon: LucideIcon; tone?: 'aqua' | 'mint' | 'red' }) {
  const tones = {
    aqua: 'bg-aqua-50 text-aqua-700 ring-aqua-200/70',
    mint: 'bg-mint-50 text-mint-700 ring-mint-200/70',
    red: 'bg-red-50 text-red-600 ring-red-200/70',
  };
  return (
    <span className={cn('inline-flex size-14 items-center justify-center rounded-2xl ring-1 ring-inset', tones[tone])}>
      <Icon className="size-6" aria-hidden="true" />
    </span>
  );
}

/** A centred, quiet loading state for while the session is checked. */
export function AuthLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white text-slate-500" role="status">
      <PlaneMark className="h-9 motion-safe:animate-pulse" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
