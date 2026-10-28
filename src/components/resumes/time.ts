import { useEffect, useState } from 'react';

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const sameYear = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const otherYear = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });
const full = new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "just now", "5 minutes ago", "yesterday", "3 days ago", then a date:
 * "Oct 12" (this year) or "Oct 12, 2025".
 */
export function timeAgo(iso: string | number, now = Date.now()): string {
  const at = typeof iso === 'number' ? iso : Date.parse(iso);
  if (!Number.isFinite(at)) return '';
  const ago = Math.max(0, now - at);
  if (ago < MINUTE) return 'just now';
  if (ago < HOUR) return relative.format(-Math.floor(ago / MINUTE), 'minute');
  if (ago < DAY) return relative.format(-Math.floor(ago / HOUR), 'hour');
  if (ago < 7 * DAY) return relative.format(-Math.floor(ago / DAY), 'day');
  const date = new Date(at);
  return (date.getFullYear() === new Date(now).getFullYear() ? sameYear : otherYear).format(date);
}

/** "Edited 2 hours ago". */
export const formatEdited = (iso: string | number, now = Date.now()) => `Edited ${timeAgo(iso, now)}`.trim();

/** For a tooltip: "Tuesday, October 28, 2026 at 3:04 PM". */
export const formatFull = (iso: string | number) => full.format(new Date(iso));

/** The current time, refreshed every `everyMs`, so relative times stay true while the page is open. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(timer);
  }, [everyMs]);
  return now;
}
