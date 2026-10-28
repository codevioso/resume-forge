import { useCallback, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from 'react';

/**
 * The content-box size of an element, kept current with a ResizeObserver.
 * Measured once synchronously before paint, so whatever is sized from it does
 * not flash at 0×0 on the first frame.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (width: number, height: number) => {
      const next = { width: Math.floor(width), height: Math.floor(height) };
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };
    const style = getComputedStyle(el);
    apply(
      el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
    );
    const observer = new ResizeObserver(([entry]) => apply(entry.contentRect.width, entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

/** Whether a media query matches, updated live. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Tailwind's `lg` breakpoint: the preview is a two-pane dialog from here up,
 * a full-screen sheet below (phones and portrait tablets).
 */
export const DIALOG_QUERY = '(min-width: 1024px)';
