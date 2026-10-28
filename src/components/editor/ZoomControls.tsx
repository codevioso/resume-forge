import { Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Zoom out / current zoom / zoom in, as one segmented control. The middle
 * button shows the zoom and returns to "fit to width" when pressed.
 */
export function ZoomControls({
  scale,
  isFit,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onFit,
  className,
}: {
  scale: number;
  isFit: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  className?: string;
}) {
  const segment =
    'inline-flex h-full items-center justify-center text-ink-700 transition hover:bg-slate-50 hover:text-ink-900 disabled:pointer-events-none disabled:text-slate-300 focus-visible:relative focus-visible:z-10';
  return (
    <div
      role="group"
      aria-label="Preview zoom"
      className={cn('inline-flex h-11 items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white', className)}
    >
      <button type="button" onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out" title="Zoom out" className={cn(segment, 'w-10')}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onFit}
        aria-label={isFit ? `Zoom ${Math.round(scale * 100)}%, fitted to width` : `Zoom ${Math.round(scale * 100)}%. Fit to width`}
        title="Fit to width"
        className={cn(segment, 'min-w-16 border-x border-slate-200 px-2 text-sm font-semibold tabular-nums')}
      >
        {Math.round(scale * 100)}%
        {isFit && <span className="ml-1.5 rounded bg-aqua-50 px-1 py-px text-[10px] font-semibold tracking-wide text-aqua-700 uppercase">Fit</span>}
      </button>
      <button type="button" onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in" title="Zoom in" className={cn(segment, 'w-10')}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
