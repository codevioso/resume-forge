import { APP_NAME } from '../constants/brand';
import { cn } from '../utils/cn';

/**
 * The paper plane from the logo, as a vector so it is sharp at any size.
 * Same shapes and colours as public/favicon.svg and the app icons.
 */
export function PlaneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={cn('h-6 w-auto', className)} aria-hidden="true">
      <g stroke="#151c48" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
        <polygon points="150,5 10,42 40,57" fill="#0ef0f8" />
        <polygon points="150,5 40,57 45,90 63,72" fill="#1d8fb8" />
        <polygon points="150,5 63,72 98,90" fill="#0ef0f8" />
      </g>
    </svg>
  );
}

/**
 * The brand in a header or footer.
 *
 * `full` is the logo artwork (wordmark, plane and "Resume builder"), for the
 * landing page and desktop headers. `compact` is the plane and the name set in
 * type, for app bars on phones where the full logo's subtitle would be too
 * small to read.
 */
export function BrandMark({
  variant = 'full',
  className,
}: {
  variant?: 'full' | 'compact';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <PlaneMark className="h-6" />
        <span className="text-lg font-extrabold tracking-tight text-ink-900">{APP_NAME}</span>
      </span>
    );
  }
  return (
    <img
      src="/logo/logo.png"
      alt={`${APP_NAME} — Resume builder`}
      width={793}
      height={277}
      className={cn('h-10 w-auto', className)}
      draggable={false}
    />
  );
}
