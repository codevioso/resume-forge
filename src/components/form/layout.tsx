import { useId, type ReactNode } from 'react';
import { Check, ChevronDown, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

/** What every section of the form gets from the editor. */
export interface SectionProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * One collapsible section of the form: a card whose header is the toggle.
 *
 * The body stays mounted and animates its height with a 0fr → 1fr grid row.
 * When closed it is `inert` and `invisible`, so nothing inside can be focused,
 * read out or found with find-in-page. Reduced motion skips the animation.
 */
export function SectionCard({
  icon: Icon,
  title,
  summary,
  count,
  units,
  done,
  open,
  onToggle,
  children,
}: SectionProps & {
  icon: LucideIcon;
  title: string;
  /** The subtitle line: what is in the section, or what belongs in it. */
  summary: string;
  /** Number of entries, shown as a badge. Omit for sections that are not lists. */
  count?: number;
  /** Singular and plural for screen readers: ['position', 'positions']. */
  units?: [string, string];
  /** The section has something that will print on the resume. */
  done: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const panelId = `${id}-panel`;

  return (
    <section aria-labelledby={titleId} className="card">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          aria-labelledby={titleId}
          aria-describedby={descId}
          className={cn(
            'flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:gap-3.5 sm:px-5',
            'hover:bg-slate-50/80 active:bg-slate-50 focus-visible:outline-offset-[-2px]',
            open ? 'rounded-t-2xl' : 'rounded-2xl',
          )}
        >
          <span
            aria-hidden="true"
            className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100 ring-inset"
          >
            <Icon className="size-5" strokeWidth={1.8} />
            {done && (
              <span className="absolute -right-1.5 -bottom-1.5 grid size-[1.125rem] place-items-center rounded-full bg-mint-500 text-white ring-2 ring-white">
                <Check className="size-3" strokeWidth={3.5} />
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span id={titleId} className="block text-[0.9375rem] leading-6 font-semibold text-ink-900">
              {title}
            </span>
            {/* `relative` keeps the screen-reader count inside this clipped line: an
                absolute sr-only span past the ellipsis would otherwise widen the
                page's scroll area on phones. */}
            <span id={descId} className="relative block truncate text-[0.8125rem] leading-5 text-slate-500">
              {summary}
              {count !== undefined && units && (
                <span className="sr-only">
                  , {count} {count === 1 ? units[0] : units[1]}
                </span>
              )}
            </span>
          </span>
          {count !== undefined && count > 0 && (
            <span
              aria-hidden="true"
              className="min-w-6 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-center text-xs leading-5 font-semibold text-slate-700 tabular-nums"
            >
              {count}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-5 shrink-0 text-slate-400 transition-transform duration-300 motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </button>
      </h3>
      <div
        id={panelId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows,visibility] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
          open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        )}
      >
        <div className="relative min-h-0 overflow-hidden">
          <div className="@container border-t border-slate-100 px-4 pt-4 pb-5 sm:px-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** A short line of guidance for a list that has nothing in it yet. */
export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-sm text-slate-600">{children}</p>;
}

export function EntryList({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('space-y-3 empty:hidden', className)}>{children}</ul>;
}

/**
 * One job, school, project… inside a section: a tinted sub-card with a title
 * line that reflects what has been typed, and a remove button.
 */
export function EntryCard({
  title,
  placeholder,
  meta,
  removeLabel,
  onRemove,
  variant = 'card',
  children,
}: {
  /** What the entry is, e.g. "Senior Engineer · Acme". Empty shows the placeholder. */
  title: string;
  placeholder: string;
  /** A second, quieter line, e.g. the dates. */
  meta?: string;
  removeLabel: string;
  onRemove: () => void;
  /** `card` is a tinted box; `row` sits in a divided list. */
  variant?: 'card' | 'row';
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        '@container motion-safe:animate-fade-in',
        variant === 'card' ? 'rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4' : 'p-3',
      )}
    >
      <div className={cn('flex items-center gap-2', variant === 'card' ? 'mb-3' : 'mb-2')}>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-semibold', title ? 'text-ink-900' : 'text-slate-500')}>
            {title || placeholder}
          </p>
          {meta && <p className="truncate text-xs text-slate-500">{meta}</p>}
        </div>
        <RemoveButton label={removeLabel} onClick={onRemove} className="-my-2 -mr-2" />
      </div>
      {children}
    </li>
  );
}

export function RemoveButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn('btn-icon shrink-0 text-slate-500 hover:bg-red-50 hover:text-red-600', className)}
    >
      <Trash2 className="size-[1.125rem]" strokeWidth={1.8} />
    </button>
  );
}

/** The dashed, full-width "Add …" button at the end of a list. */
export function AddButton({
  onClick,
  children,
  size = 'md',
  className,
  ...aria
}: {
  onClick: () => void;
  children: ReactNode;
  size?: 'md' | 'sm';
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...aria}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl border-dashed bg-white px-4 font-semibold text-ink-700 transition',
        'hover:border-aqua-500 hover:bg-aqua-50/60 hover:text-ink-900 active:scale-[0.99] motion-reduce:active:scale-100',
        size === 'md' ? 'min-h-12 border-2 border-slate-300 text-sm' : 'min-h-11 border-[1.5px] border-slate-300 text-sm',
        className,
      )}
    >
      <Plus className="size-[1.125rem]" strokeWidth={2.2} aria-hidden="true" />
      {children}
    </button>
  );
}

/** A small group heading inside a section, with a hairline rule. */
export function GroupHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <p id={id} className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
        {children}
      </p>
      <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
