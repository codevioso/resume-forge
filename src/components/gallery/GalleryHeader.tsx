import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { APP_NAME } from '../../constants/brand';
import type { Template } from '../../types/resume';
import { cn } from '../../utils/cn';
import { ColorDots } from './TemplateCard';

const STEPS = ['Template', 'Details', 'Download'];

/** Where the user is in the flow: choose a design, fill it in, download. */
function Stepper({ className }: { className?: string }) {
  return (
    <ol className={cn('items-center gap-3 text-sm', className)} aria-label="Progress">
      {STEPS.map((label, i) => {
        const current = i === 0;
        return (
          <li key={label} className="flex items-center gap-3" aria-current={current ? 'step' : undefined}>
            {i > 0 && <span className="h-px w-8 bg-slate-300" aria-hidden="true" />}
            <span className={cn('flex items-center gap-2', current ? 'font-semibold text-ink-900' : 'text-slate-500')}>
              <span
                className={cn(
                  'grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums',
                  current ? 'bg-ink-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-300',
                )}
              >
                {i + 1}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Desktop: back, the full logo, the steps and the Continue button.
 * Phones: an app bar — back, then the brand, which gives way to the page
 * title once the big heading has scrolled out of view.
 */
export function GalleryHeader({
  selected,
  condensed,
  onBack,
  onContinue,
}: {
  selected: Template | null;
  /** The page's own heading is out of view: show the title in the bar. */
  condensed: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-1.5 md:h-16 md:gap-3 md:px-6 lg:px-8">
        <button type="button" onClick={onBack} className="btn-icon shrink-0 md:-ml-2.5" aria-label="Back" title="Back">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>

        {/* Phones: brand, cross-fading to the title on scroll. */}
        <div className="relative h-full min-w-0 flex-1 md:hidden">
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center transition duration-200',
              condensed && 'pointer-events-none -translate-y-1 opacity-0',
            )}
            aria-hidden={condensed}
          >
            <Link to="/" aria-label={`${APP_NAME} home`} className="flex min-h-11 items-center px-2" tabIndex={condensed ? -1 : 0}>
              <BrandMark variant="compact" />
            </Link>
          </span>
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center truncate text-[15px] font-semibold text-ink-900 transition duration-200',
              !condensed && 'translate-y-1 opacity-0',
            )}
            aria-hidden="true"
          >
            Choose Your Template
          </span>
        </div>
        <span className="size-11 shrink-0 md:hidden" aria-hidden="true" />

        {/* Desktop. */}
        <div className="hidden min-w-0 flex-1 items-center gap-4 md:flex">
          <span className="h-6 w-px bg-slate-200" aria-hidden="true" />
          <Link to="/" aria-label={`${APP_NAME} home`} className="shrink-0 rounded-lg">
            <BrandMark className="h-9" />
          </Link>
          <Stepper className="mx-auto hidden lg:flex" />
        </div>
        <div className="hidden shrink-0 items-center gap-4 md:flex">
          {selected && (
            <span key={selected.id} className="hidden items-center gap-2 text-sm text-slate-600 motion-safe:animate-fade-in xl:flex">
              <ColorDots colors={selected.colors} />
              <span className="max-w-48 truncate">
                <span className="sr-only">Selected: </span>
                <span className="font-semibold text-ink-900">{selected.name}</span>
              </span>
            </span>
          )}
          <button type="button" onClick={onContinue} disabled={!selected} className="btn-primary pr-4">
            Continue
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
