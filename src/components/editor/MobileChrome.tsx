import type { ReactNode } from 'react';
import { ChevronLeft, Download, Eye, Loader2, Palette, PenLine, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export type MobileTab = 'edit' | 'preview' | 'design';

/** The app bar's height without the notch inset (Tailwind `h-14`). */
export const APP_BAR_HEIGHT = '3.5rem';
/** The tab bar's height without the home-indicator inset (Tailwind `h-16`). */
export const TAB_BAR_HEIGHT = '4rem';

/**
 * The phone app bar: back, title with the save status beneath it, and the
 * export action. Translucent, so content scrolls visibly under it.
 *
 * `onTitleClick` makes the title a button (a saved resume: tap to rename).
 * `account` is the compact account menu, after the export action.
 */
export function MobileAppBar({
  title,
  status,
  onBack,
  backLabel = 'Back to templates',
  onTitleClick,
  titleActionLabel,
  onExport,
  isExporting,
  account,
}: {
  title: string;
  status: ReactNode;
  onBack: () => void;
  backLabel?: string;
  onTitleClick?: () => void;
  /** The title button's hint for screen readers, e.g. "Rename". */
  titleActionLabel?: string;
  onExport: () => void;
  isExporting: boolean;
  account?: ReactNode;
}) {
  return (
    <header className="pt-safe absolute inset-x-0 top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-2xl backdrop-saturate-150 select-none">
      <div className={cn('flex h-14 items-center gap-1 pl-1', account ? 'pr-1' : 'pr-3')}>
        <button type="button" onClick={onBack} className="btn-icon shrink-0" aria-label={backLabel}>
          <ChevronLeft className="size-6" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-6 font-semibold tracking-tight text-ink-900">
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                className="-mx-1 max-w-full truncate rounded-md px-1 text-left active:bg-slate-200/60"
              >
                {title}
                {titleActionLabel && <span className="sr-only">, {titleActionLabel}</span>}
              </button>
            ) : (
              title
            )}
          </h1>
          {status}
        </div>
        {/* A 36px pill inside a 44px touch target, so the bar stays light. */}
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          aria-busy={isExporting}
          aria-label={isExporting ? 'Exporting PDF' : 'Export PDF'}
          className="group inline-flex min-h-11 shrink-0 items-center rounded-full px-0.5 disabled:pointer-events-none"
        >
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 pr-3.5 pl-3 text-sm font-semibold text-white shadow-soft transition group-hover:bg-ink-800 group-active:scale-95 group-disabled:opacity-80">
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            PDF
          </span>
        </button>
        {account}
      </div>
    </header>
  );
}

const TABS: { id: MobileTab; label: string; icon: LucideIcon }[] = [
  { id: 'edit', label: 'Edit', icon: PenLine },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'design', label: 'Design', icon: Palette },
];

/**
 * The phone tab bar. Switching is instant and keeps each view's state and
 * scroll position; tapping the current tab scrolls it back to the top.
 */
export function BottomTabBar({ active, onSelect }: { active: MobileTab; onSelect: (tab: MobileTab) => void }) {
  return (
    <nav
      aria-label="Editor views"
      className="pb-safe absolute inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl backdrop-saturate-150 select-none"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-3">
        {TABS.map(({ id, label, icon: Icon }) => {
          const current = id === active;
          return (
            <li key={id} className="flex">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={current ? 'page' : undefined}
                className="group flex flex-1 flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-offset-[-4px]"
              >
                <span
                  className={cn(
                    'flex h-8 w-16 items-center justify-center rounded-full transition-colors duration-200',
                    current ? 'bg-aqua-100 text-ink-900' : 'text-slate-500 group-active:bg-slate-100',
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={current ? 2.25 : 1.75} aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'text-xs leading-none transition-colors',
                    current ? 'font-semibold text-ink-900' : 'font-medium text-slate-500',
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
