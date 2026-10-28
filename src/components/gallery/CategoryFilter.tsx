import { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';
import { CATEGORY_LABELS, CATEGORY_ORDER, type CategoryFilterValue } from './categories';

/**
 * "All" plus one chip per category, each with its count. A single row that
 * scrolls sideways (with snap) on phones, wraps to fit on wider screens.
 */
export function CategoryFilter({
  value,
  counts,
  onChange,
  className,
}: {
  value: CategoryFilterValue;
  counts: Record<CategoryFilterValue, number>;
  onChange: (value: CategoryFilterValue) => void;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const options: CategoryFilterValue[] = ['all', ...CATEGORY_ORDER.filter((c) => counts[c] > 0)];

  // Keep the active chip in view when it changes (e.g. restored from the URL).
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!row || !chip) return;
    const left = chip.offsetLeft;
    if (left < row.scrollLeft || left + chip.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: left - 16, behavior: 'smooth' });
    }
  }, [value]);

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label="Filter templates by category"
      className={cn(
        'no-scrollbar relative flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain',
        className,
      )}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={cn(
              'inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium transition md:min-h-10',
              'active:scale-[0.97]',
              active
                ? 'border-ink-900 bg-ink-900 text-white shadow-soft'
                : 'border-slate-200 bg-white text-ink-700 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            {option === 'all' ? 'All' : CATEGORY_LABELS[option]}
            <span
              className={cn(
                'min-w-5 rounded-full px-1.5 py-px text-center text-xs font-semibold tabular-nums',
                active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600',
              )}
            >
              {counts[option]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
