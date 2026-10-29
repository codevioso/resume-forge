import { useId } from 'react';
import { cn } from '../../utils/cn';

/**
 * The credit "coin": the logo's paper plane on an aqua-to-mint disc. Used
 * wherever credits are counted, so a number next to it reads as credits.
 * Decorative: the text beside it always says "credits".
 */
export function CreditGlyph({ className, muted = false }: { className?: string; muted?: boolean }) {
  // Usable inside url(#…) whatever characters React puts in its ids.
  const id = `credit-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5 shrink-0', className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-coin`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={muted ? '#e2e8f0' : '#9bf8fc'} />
          <stop offset="1" stopColor={muted ? '#cbd5e1' : '#66f6be'} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${id}-coin)`} />
      <circle cx="12" cy="12" r="11" fill="none" stroke={muted ? '#94a3b8' : '#151c48'} strokeOpacity={muted ? 0.5 : 0.14} strokeWidth="1" />
      {/* The logo's plane, scaled into the coin. */}
      <g fill={muted ? '#64748b' : '#151c48'} strokeLinejoin="round">
        <path d="M18.6 7.9 5.2 11.45l2.9 1.5Z" />
        <path d="M18.6 7.9 8.1 12.95l.45 3.1 1.75-1.7Z" opacity="0.6" />
        <path d="M18.6 7.9 10.3 14.35l3.35 1.7Z" />
      </g>
    </svg>
  );
}
