import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { templates } from '../../data/templates';
import type { Template, TemplateCategory } from '../../types/resume';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../../constants/layout';
import { TemplateThumbnail } from '../TemplateThumbnail';
import { cn } from '../../utils/cn';

type Filter = 'all' | TemplateCategory;

const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  corporate: 'Corporate',
  creative: 'Creative',
  tech: 'Tech',
  minimal: 'Minimal',
  academic: 'Academic',
};

const CATEGORY_ORDER: TemplateCategory[] = ['corporate', 'creative', 'tech', 'minimal', 'academic'];

/** The gap between grid columns, in px (Tailwind `gap-x-3`). */
export const PICKER_GAP = 12;

/** Thumbnail height that fills a column `width` px wide at the A4 ratio. */
export function thumbHeightFor(width: number): number {
  return Math.max(80, Math.floor((width * A4_HEIGHT_PX) / A4_WIDTH_PX));
}

/**
 * Every template as a real thumbnail, filterable by category. Picking one
 * switches the design at once; the resume content is untouched.
 *
 * Memoised: the thumbnails render the sample resume, not the user's, so
 * typing in the form never re-renders them.
 */
export const TemplatePicker = memo(function TemplatePicker({
  selectedId,
  onSelect,
  columns,
  thumbHeight,
  focusSelectedOnMount = false,
  className,
}: {
  selectedId: string;
  onSelect: (template: Template) => void;
  columns: number;
  thumbHeight: number;
  /** Move keyboard focus to the current template when shown (the popover). */
  focusSelectedOnMount?: boolean;
  className?: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const selectedRef = useRef<HTMLButtonElement>(null);

  const counts = useMemo(() => {
    const byCategory = new Map<TemplateCategory, number>();
    for (const t of templates) byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
    return byCategory;
  }, []);

  const shown = filter === 'all' ? templates : templates.filter((t) => t.category === filter);

  useEffect(() => {
    if (!focusSelectedOnMount) return;
    selectedRef.current?.focus({ preventScroll: true });
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [focusSelectedOnMount]);

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: templates.length },
    ...CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({ value: c, label: CATEGORY_LABEL[c], count: counts.get(c)! })),
  ];

  return (
    <div className={className}>
      {/* Filter chips. Each button is a 44px touch target around a 36px chip. */}
      <div
        role="group"
        aria-label="Filter templates by style"
        className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4"
      >
        {filters.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              className="group flex min-h-11 shrink-0 items-center rounded-full focus-visible:outline-offset-0"
            >
              <span className={active ? 'chip-active' : 'chip'}>
                {f.label}
                <span className={cn('text-xs tabular-nums', active ? 'text-ink-200' : 'text-slate-400')}>{f.count}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ul className="grid gap-x-3 gap-y-5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {shown.map((template) => {
          const selected = template.id === selectedId;
          return (
            <li key={template.id}>
              <button
                ref={selected ? selectedRef : undefined}
                type="button"
                onClick={() => onSelect(template)}
                aria-pressed={selected}
                className="group block w-full rounded-xl text-left"
              >
                <span
                  className={cn(
                    'relative block overflow-hidden rounded-xl bg-white transition duration-200',
                    selected
                      ? 'shadow-lift ring-2 ring-aqua-500'
                      : 'shadow-soft ring-1 ring-slate-200 group-hover:-translate-y-0.5 group-hover:shadow-lift group-hover:ring-slate-300 group-active:translate-y-0',
                  )}
                >
                  <TemplateThumbnail template={template} height={thumbHeight} className="w-full bg-white" />
                  {selected && (
                    <span
                      className="absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-full bg-aqua-400 text-ink-950 shadow-soft ring-2 ring-white"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="mt-2 flex items-center gap-1.5 px-0.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: template.colors.primary }}
                    aria-hidden="true"
                  />
                  <span className={cn('truncate text-sm', selected ? 'font-semibold text-ink-900' : 'font-medium text-ink-800')}>
                    {template.name}
                  </span>
                </span>
                <span className="mt-0.5 block px-0.5 text-xs text-slate-500">
                  {selected ? 'Current design' : CATEGORY_LABEL[template.category]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
