import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether a media query matches, kept in sync as the window changes.
 *
 * Read during render (not in an effect), so the first paint already has the
 * right layout: the editor never flashes the phone shell on a desktop.
 */
export function useMediaQuery(query: string): boolean {
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

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** `navigator.onLine`, updated when the connection drops or comes back. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/** The viewport's width in CSS px, updated on resize and rotation. */
export function useViewportWidth(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => document.documentElement.clientWidth,
    () => 390,
  );
}
