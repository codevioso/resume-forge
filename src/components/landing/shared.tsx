import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

/** The landing page's content width. Every section lines up on it. */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

/** Vertical rhythm shared by the content sections. */
export const SECTION_Y = 'py-16 sm:py-24 lg:py-28';

/**
 * Eyebrow, h2 and lede at the top of a section. `id` goes on the h2 so the
 * section can point `aria-labelledby` at it. `tinted` darkens the eyebrow so
 * it keeps AA contrast on the slate-50 bands.
 */
export function SectionHeader({
  id,
  eyebrow,
  title,
  lede,
  align = 'center',
  tinted = false,
  className,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: 'center' | 'left';
  tinted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      <p
        className={cn(
          'text-xs font-semibold tracking-[0.14em] uppercase',
          tinted ? 'text-aqua-800' : 'text-aqua-700',
        )}
      >
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-3 text-[1.875rem] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance text-ink-900 sm:text-4xl lg:text-[2.625rem] lg:leading-[1.1]"
      >
        {title}
      </h2>
      {lede && <p className="mt-4 text-base leading-relaxed text-pretty text-slate-600 sm:text-lg">{lede}</p>}
    </div>
  );
}

const CHIP_TONES = {
  aqua: 'bg-aqua-50 text-aqua-700 ring-aqua-200/70',
  mint: 'bg-mint-50 text-mint-700 ring-mint-200/70',
  ink: 'bg-ink-50 text-ink-700 ring-ink-100',
} as const;

/** A lucide icon on a softly tinted, rounded tile. */
export function IconChip({
  icon: Icon,
  tone = 'aqua',
  className,
}: {
  icon: LucideIcon;
  tone?: keyof typeof CHIP_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
        CHIP_TONES[tone],
        className,
      )}
    >
      <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

/** Where an element is relative to the viewport: in it, above it (scrolled past) or below it. */
export type ViewportPosition = 'in' | 'above' | 'below';

export function useViewportPosition(ref: RefObject<Element | null>, initial: ViewportPosition): ViewportPosition {
  const [position, setPosition] = useState<ViewportPosition>(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPosition('in');
      else setPosition(entry.boundingClientRect.top < 0 ? 'above' : 'below');
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return position;
}

/**
 * Renders `children` only once they are close to the viewport, or once the
 * browser is idle, whichever comes first. The template thumbnails are full
 * React renders of a resume; deferring the ones below the fold keeps the
 * first paint about the hero.
 */
export function DeferredMount({
  children,
  placeholder,
  className,
}: {
  children: ReactNode;
  placeholder: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const done = () => setReady(true);
    let io: IntersectionObserver | undefined;
    if (ref.current && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && done(), {
        rootMargin: '600px',
      });
      io.observe(ref.current);
    }
    let cancelIdle: () => void;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(done, { timeout: 2500 });
      cancelIdle = () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(done, 1200);
      cancelIdle = () => clearTimeout(id);
    }
    return () => {
      io?.disconnect();
      cancelIdle();
    };
  }, [ready]);

  return (
    <div ref={ref} className={className}>
      {ready ? children : placeholder}
    </div>
  );
}

/**
 * Scroll to an in-page section without touching the router. Respects the
 * section's `scroll-margin-top`, so the sticky header never covers its heading.
 */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
