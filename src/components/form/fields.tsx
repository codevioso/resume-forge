import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../utils/cn';

/*
 * Form controls for the editor. Every control has a real <label> (or an
 * aria-label when the label is implied by its row), and uses the design
 * system's `field-*` classes so phones get 16px text and iOS does not zoom.
 */

function FieldShell({
  id,
  label,
  optional,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className' | 'id'> & {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: string;
  /** Classes for the wrapper (grid placement). */
  className?: string;
};

export function TextField({ label, value, onChange, optional, hint, className, type = 'text', ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} optional={optional} hint={hint} className={className}>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="field-input disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:placeholder:text-slate-500"
        {...rest}
      />
    </FieldShell>
  );
}

const supportsFieldSizing =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('field-sizing', 'content');

/**
 * Grows a textarea with its text. Browsers with `field-sizing: content` do
 * this in CSS; elsewhere (Firefox, older Safari) it is measured here.
 */
function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    if (supportsFieldSizing) return;
    const el = ref.current;
    if (el) fitHeight(el);
  }, [ref, value]);

  useEffect(() => {
    const el = ref.current;
    if (supportsFieldSizing || !el || typeof ResizeObserver === 'undefined') return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fitHeight(el);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

function fitHeight(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'className' | 'id' | 'rows'> & {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  optional?: boolean;
  hint?: string;
  className?: string;
  /** Height when empty, in lines. It grows from there as the user types. */
  minRows?: number;
};

export function TextAreaField({
  label,
  value,
  onChange,
  optional,
  hint,
  className,
  minRows = 3,
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = value ?? '';
  useAutoGrow(ref, text);
  return (
    <FieldShell id={id} label={label} optional={optional} hint={hint} className={className}>
      <textarea
        ref={ref}
        id={id}
        rows={minRows}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        // `lh` is the textarea's own line height, so the minimum is exact at 16px and 14px text.
        style={{ minHeight: `calc(${minRows}lh + 1.25rem + 2px)` }}
        className="field-input field-sizing-content resize-none sm:leading-relaxed"
        {...rest}
      />
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-ink-800 select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 cursor-pointer rounded"
      />
      {label}
    </label>
  );
}

/**
 * A 0–100 slider with the value beside it. The track fills in ink up to the
 * thumb; the input itself is 44px tall so it is easy to grab on a phone.
 */
export function LevelSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name, e.g. "TypeScript level". */
  label: string;
}) {
  const id = useId();
  const level = Number.isFinite(value) ? value : 0;
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="w-10 shrink-0 text-xs font-medium text-slate-600">
        Level
      </span>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        value={level}
        onChange={(e) => onChange(parseInt(e.target.value))}
        aria-label={label}
        aria-valuetext={`${level}%`}
        style={{ '--fill': `${level}%` } as CSSProperties}
        className={cn(
          'h-11 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent focus-visible:outline-offset-0',
          // WebKit / Blink: track filled up to the thumb, white thumb with an ink ring.
          '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full',
          '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-ink-900)_var(--fill),var(--color-slate-200)_var(--fill))]',
          '[&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-900 [&::-webkit-slider-thumb]:bg-white',
          '[&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgb(21_28_72/0.3)] [&::-webkit-slider-thumb]:transition-transform',
          'active:[&::-webkit-slider-thumb]:scale-110 motion-reduce:[&::-webkit-slider-thumb]:transition-none',
          // Firefox.
          '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-200',
          '[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-ink-900',
          '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2',
          '[&::-moz-range-thumb]:border-ink-900 [&::-moz-range-thumb]:bg-white',
        )}
      />
      {/* Hidden from screen readers: the slider already says its value, and an
          <output> is a live region that would announce every step twice. */}
      <output
        htmlFor={id}
        aria-hidden="true"
        className="w-12 shrink-0 rounded-lg bg-white py-1 text-center text-sm font-semibold text-ink-900 tabular-nums ring-1 ring-slate-200"
      >
        {level}%
      </output>
    </div>
  );
}
