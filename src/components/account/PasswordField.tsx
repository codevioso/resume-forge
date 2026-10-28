import { forwardRef, useState, type ReactNode } from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';
import { MIN_PASSWORD } from './authHelpers';
import { cn } from '../../utils/cn';

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

/**
 * A rough, honest guide: length matters most, then mixing kinds of
 * characters. It is a hint, not a rule — the server only asks for 8+.
 */
function strengthOf(pw: string): Strength {
  if (!pw) return { score: 0, label: '' };
  if (pw.length < MIN_PASSWORD) return { score: 1, label: 'Too short' };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length >= 16 || (pw.length >= 12 && kinds >= 3)) return { score: 4, label: 'Strong' };
  if (pw.length >= 12 || (pw.length >= 10 && kinds >= 2)) return { score: 3, label: 'Good' };
  return { score: 2, label: 'Okay' };
}

const BAR = ['', 'bg-red-500', 'bg-amber-400', 'bg-aqua-500', 'bg-mint-500'];
const TEXT = ['', 'text-red-700', 'text-amber-700', 'text-aqua-800', 'text-mint-800'];

/**
 * A password input with a show/hide button, and (for new passwords) a
 * strength meter. Showing the password is a better guard against typos than
 * a second "confirm" field, and kinder on a phone keyboard.
 */
export const PasswordField = forwardRef<
  HTMLInputElement,
  {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete: 'current-password' | 'new-password';
    error?: string | null;
    hint?: ReactNode;
    showStrength?: boolean;
    labelAside?: ReactNode;
    autoFocus?: boolean;
    disabled?: boolean;
    className?: string;
  }
>(function PasswordField(
  { id, label, value, onChange, autoComplete, error, hint, showStrength = false, labelAside, autoFocus, disabled, className },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? strengthOf(value) : null;
  const describedBy = [error ? `${id}-error` : hint ? `${id}-hint` : null, strength?.score ? `${id}-strength` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'field-input min-h-12 pr-12',
            error && 'border-red-400 hover:border-red-500 focus:border-red-500 focus:ring-red-100',
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0.5 my-auto inline-flex size-11 items-center justify-center rounded-xl text-slate-500 transition hover:text-ink-900"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
          disabled={disabled}
        >
          {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {strength && strength.score > 0 && (
        <div className="mt-2 flex items-center gap-3">
          <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn('h-1.5 rounded-full transition-colors duration-300', i <= strength.score ? BAR[strength.score] : 'bg-slate-200')}
              />
            ))}
          </div>
          <span id={`${id}-strength`} className={cn('w-16 text-right text-xs font-semibold', TEXT[strength.score])} aria-live="polite">
            <span className="sr-only">Password strength: </span>
            {strength.label}
          </span>
        </div>
      )}

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
