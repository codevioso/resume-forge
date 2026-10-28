import { Activity, useCallback, useEffect, useLayoutEffect, useState, type ReactNode, type Ref } from 'react';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../../constants/layout';
import { ResumePreview } from '../ResumePreview';
import { cn } from '../../utils/cn';

export type PreviewMetrics = { fitScale: number; pages: number };

/** Smallest and largest zoom the canvas allows. */
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 1.5;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * The live resume, scaled onto a scrollable canvas.
 *
 * The page is laid out at its real A4 width and scaled with a transform; an
 * outer box takes the *scaled* size, so the canvas scrolls exactly as far as
 * the document reaches (a bare transform leaves the unscaled size behind).
 *
 * `zoom="fit"` fits the page to the canvas width (capped at `maxFit`). The
 * scroll container is this component's root; `className` sets its position
 * and padding.
 *
 * `active=false` hides the document inside an `<Activity>`: on phones, the
 * preview tab keeps its state and scroll position while the form is shown,
 * and re-rendering it on every keystroke drops to idle priority so typing
 * stays smooth.
 */
export function PreviewCanvas({
  zoom,
  maxFit = 1,
  active = true,
  onMetrics,
  scrollRef,
  className,
  before,
  after,
}: {
  zoom: number | 'fit';
  maxFit?: number;
  active?: boolean;
  onMetrics?: (metrics: PreviewMetrics) => void;
  scrollRef?: Ref<HTMLDivElement>;
  className?: string;
  /** Content above / below the page, inside the scroll area. */
  before?: ReactNode;
  after?: ReactNode;
}) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [doc, setDoc] = useState<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [docHeight, setDocHeight] = useState(A4_HEIGHT_PX);

  const setBoxRef = useCallback(
    (el: HTMLDivElement | null) => {
      setBox(el);
      if (typeof scrollRef === 'function') scrollRef(el);
      else if (scrollRef) scrollRef.current = el;
    },
    [scrollRef],
  );

  // The canvas's content width (inside its padding), for the fit scale.
  // Zero while hidden; the last real width is kept.
  useLayoutEffect(() => {
    if (!box) return;
    const measure = () => {
      const style = getComputedStyle(box);
      const width = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (width > 0) setAvailableWidth(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [box]);

  // The document's unscaled height: grows with the content, page by page.
  useLayoutEffect(() => {
    if (!doc) return;
    const measure = () => {
      if (doc.offsetHeight > 0) setDocHeight(doc.offsetHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(doc);
    return () => observer.disconnect();
  }, [doc]);

  const fitScale = availableWidth > 0 ? clamp(availableWidth / A4_WIDTH_PX, 0.2, maxFit) : Math.min(0.5, maxFit);
  const scale = zoom === 'fit' ? fitScale : zoom;
  // A pixel of slack: rounding can leave a one-page resume a hair over A4.
  const pages = Math.max(1, Math.ceil((docHeight - 2) / A4_HEIGHT_PX));

  useEffect(() => {
    onMetrics?.({ fitScale, pages });
  }, [onMetrics, fitScale, pages]);

  return (
    <div ref={setBoxRef} className={cn('overflow-auto overscroll-contain', className)}>
      {before}
      <div
        className="relative mx-auto overflow-hidden rounded-[3px] bg-white shadow-lift ring-1 ring-ink-900/5"
        style={{ width: Math.round(A4_WIDTH_PX * scale), height: Math.round(docHeight * scale) }}
      >
        <div
          style={{
            width: A4_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <Activity mode={active ? 'visible' : 'hidden'}>
            <div ref={setDoc}>
              <ResumePreview showPageGuides />
            </div>
          </Activity>
        </div>
      </div>
      {after}
    </div>
  );
}
