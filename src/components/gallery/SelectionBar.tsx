import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { TemplateThumbnail } from '../TemplateThumbnail';
import type { Template } from '../../types/resume';

/**
 * Phones only: a bar pinned above the home indicator with the chosen template
 * and the Continue button, like the action bar of a native app. On desktop
 * the same button lives in the header.
 */
export function SelectionBar({ selected, onContinue }: { selected: Template | null; onContinue: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 pb-safe backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
        {selected ? (
          <div className="shrink-0" inert>
            <TemplateThumbnail
              key={selected.id}
              template={selected}
              height={46}
              className="rounded-[4px] bg-white shadow-soft ring-1 ring-slate-900/10 motion-safe:animate-fade-in"
            />
          </div>
        ) : (
          <span className="grid h-[46px] w-[33px] shrink-0 place-items-center rounded-[4px] border border-dashed border-slate-300 text-slate-400">
            <LayoutTemplate className="size-4" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-500">{selected ? 'Your template' : 'No template yet'}</p>
          <p key={selected?.id} className="truncate text-sm font-semibold text-ink-900 motion-safe:animate-fade-in">
            {selected ? selected.name : 'Tap a design to choose it'}
          </p>
        </div>
        <button type="button" onClick={onContinue} disabled={!selected} className="btn-primary shrink-0 pr-4">
          Continue
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
