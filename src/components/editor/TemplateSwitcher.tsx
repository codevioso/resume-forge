import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, X } from 'lucide-react';
import type { Template } from '../../types/resume';
import { cn } from '../../utils/cn';
import { PICKER_GAP, TemplatePicker, thumbHeightFor } from './TemplatePicker';

/** Popover width and grid, fixed so thumbnails can be sized before render. */
const POPOVER_WIDTH = 664;
const POPOVER_PADDING = 20;
const POPOVER_COLUMNS = 4;
/** Room for a classic (non-overlay) scrollbar inside the grid area. */
const SCROLLBAR_ALLOWANCE = 16;

const thumbHeight = thumbHeightFor(
  (POPOVER_WIDTH - POPOVER_PADDING * 2 - SCROLLBAR_ALLOWANCE - PICKER_GAP * (POPOVER_COLUMNS - 1)) / POPOVER_COLUMNS,
);

/**
 * The desktop header's template switcher: a button showing the current
 * template's name, opening a popover grid of every template.
 *
 * The button's accessible name is exactly the template name. The popover
 * closes on Escape (returning focus to the button), on a click outside, and
 * once a template is picked, so the change shows straight away in the preview.
 */
export function TemplateSwitcher({
  template,
  onSelect,
  galleryLink = true,
}: {
  template: Template;
  onSelect: (template: Template) => void;
  /**
   * Offer "Open the gallery". Off for a saved resume: for a signed-in user the
   * gallery starts a new resume rather than restyling this one.
   */
  galleryLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const pick = useCallback(
    (next: Template) => {
      onSelect(next);
      close(true);
    },
    [onSelect, close],
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        title="Switch template"
        className={cn('btn-secondary max-w-56 gap-2.5 pr-3.5 pl-3.5', open && 'border-slate-300 bg-slate-50')}
      >
        <span
          className="size-3.5 shrink-0 rounded-full ring-2 ring-white outline outline-1 outline-slate-300"
          style={{ backgroundColor: template.colors.primary }}
          aria-hidden="true"
        />
        <span className="truncate">{template.name}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Choose a template"
          className="animate-fade-in absolute top-full right-0 z-50 mt-2 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift"
          style={{ width: POPOVER_WIDTH }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 pt-4 pb-3">
            <div>
              <h2 className="text-base font-semibold text-ink-900">Switch template</h2>
              <p className="mt-0.5 text-sm text-slate-500">Your content stays exactly as it is.</p>
            </div>
            <button type="button" onClick={() => close(true)} className="btn-icon -mt-1.5 -mr-2" aria-label="Close">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-5 [scrollbar-gutter:stable]">
            <TemplatePicker
              selectedId={template.id}
              onSelect={pick}
              columns={POPOVER_COLUMNS}
              thumbHeight={thumbHeight}
              focusSelectedOnMount
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-2.5">
            <span className="text-xs text-slate-500">Previews use sample content.</span>
            {galleryLink && (
              <Link
                to="/templates"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-aqua-700 hover:bg-aqua-50 hover:text-aqua-800"
              >
                Open the gallery
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
