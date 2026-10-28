import { useId } from 'react';
import { Check, Expand, Star } from 'lucide-react';
import type { ResumeData, Template } from '../../types/resume';
import { cn } from '../../utils/cn';
import { CATEGORY_LABELS } from './categories';
import { FittedPage } from './FittedPage';

/** The template's three theme colours as overlapping dots. */
export function ColorDots({ colors, className }: { colors: Template['colors']; className?: string }) {
  return (
    <span className={cn('flex shrink-0 -space-x-1', className)} aria-hidden="true">
      {[colors.primary, colors.secondary, colors.accent].map((c, i) => (
        <span
          key={i}
          className="size-3.5 rounded-full ring-2 ring-white shadow-[inset_0_0_0_1px_rgb(15_23_42/0.12)] sm:size-4"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

/**
 * One template in the gallery grid.
 *
 * The whole card selects the template: the name is a real button (inside the
 * h3) whose ::after stretches over the card, so it is one tab stop, works with
 * Enter and Space, and reports its state with aria-pressed. The Preview
 * button sits above that layer (z-10 over z-5); the badges sit below it.
 */
export function TemplateCard({
  template,
  selected,
  popular,
  resumeData,
  onSelect,
  onPreview,
}: {
  template: Template;
  selected: boolean;
  popular: boolean;
  resumeData?: ResumeData;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const descId = useId();

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border bg-white shadow-soft transition duration-200',
        'motion-safe:has-[[data-select]:active]:scale-[0.985]',
        selected
          ? 'border-aqua-500 ring-1 ring-aqua-500 shadow-lift'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-lift motion-safe:hover:-translate-y-0.5',
      )}
    >
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm leading-snug font-semibold text-ink-900 sm:text-[15px]">
            <button
              type="button"
              data-select
              onClick={onSelect}
              aria-pressed={selected}
              aria-describedby={descId}
              className={cn(
                'text-left outline-none',
                'after:absolute after:inset-0 after:z-[5] after:rounded-2xl after:content-[""]',
                'focus-visible:after:outline-2 focus-visible:after:outline-offset-[3px] focus-visible:after:outline-aqua-700',
              )}
            >
              {template.name}
            </button>
          </h3>
          <ColorDots colors={template.colors} className="mt-0.5 hidden sm:flex" />
        </div>

        <p id={descId} className="hidden text-sm leading-relaxed text-slate-600 sm:line-clamp-2 sm:block">
          {template.description}
        </p>

        {/* Phones: palette and category instead of the description. */}
        <div className="mt-auto flex items-center gap-2 sm:hidden">
          <ColorDots colors={template.colors} />
          <span className="truncate text-xs text-slate-500">{CATEGORY_LABELS[template.category]}</span>
        </div>

        <p className="mt-auto hidden truncate border-t border-slate-100 pt-2.5 text-xs text-slate-500 sm:block">
          <span className="font-medium text-slate-500">Best for </span>
          <span className="text-slate-700">{template.bestFor}</span>
        </p>
      </div>
      {/* The page, cropped at the bottom like a sheet sitting in a tray. Shown
          first, but after the name in the DOM so the name is read (and
          tabbed to) before the Preview button. */}
      <div
        className={cn(
          'relative order-first aspect-[5/6] overflow-hidden rounded-t-[calc(1rem-1px)] px-3 pt-3 sm:px-5 sm:pt-5',
          selected ? 'bg-aqua-50' : 'bg-slate-100',
        )}
      >
        <FittedPage
          template={template}
          resumeData={resumeData}
          className="w-full transition-transform duration-300 ease-out motion-safe:group-hover:-translate-y-1"
          pageClassName="rounded-t-[3px] shadow-[0_1px_2px_rgb(15_23_42/0.08),0_6px_20px_-6px_rgb(15_23_42/0.22)] ring-1 ring-slate-900/5"
        />
        {/* Fade the crop so the cut edge reads as intentional. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/[0.04] to-transparent" />

        {popular && (
          <span className="pointer-events-none absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink-900 px-1.5 py-[3px] text-[10px] leading-none font-semibold text-white shadow-soft sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs sm:leading-4">
            <Star className="size-2.5 fill-aqua-400 sm:size-3 text-aqua-400" aria-hidden="true" />
            Popular
          </span>
        )}

        {selected && (
          <span className="pointer-events-none absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-aqua-400 text-ink-950 shadow-soft ring-[3px] ring-white motion-safe:animate-fade-in sm:top-3 sm:right-3 sm:size-8">
            <Check className="size-4 sm:size-[18px]" strokeWidth={3} aria-hidden="true" />
          </span>
        )}

        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview ${template.name}`}
          className={cn(
            'absolute right-2 bottom-2 z-10 grid size-9 place-items-center rounded-full border border-slate-200 bg-white/95 text-ink-800 shadow-soft transition',
            'before:absolute before:-inset-1 before:content-[""] hover:bg-white hover:text-ink-950 active:scale-95',
            'md:right-auto md:bottom-4 md:left-1/2 md:flex md:h-9 md:w-auto md:-translate-x-1/2 md:gap-1.5 md:px-3.5 md:text-sm md:font-semibold',
            '[@media(hover:hover)]:md:translate-y-1 [@media(hover:hover)]:md:opacity-0',
            'md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100',
          )}
        >
          <Expand className="size-4" aria-hidden="true" />
          <span className="hidden md:inline">Preview</span>
        </button>
      </div>

    </article>
  );
}
