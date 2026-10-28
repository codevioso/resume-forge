/** True when any of the values is a string with something other than spaces in it. */
export function hasText(...values: unknown[]): boolean {
  return values.some((v) => typeof v === 'string' && v.trim() !== '');
}

/** The non-empty parts, trimmed and joined: `joinParts(['Engineer', '', 'Acme'])` → "Engineer · Acme". */
export function joinParts(parts: unknown[], separator = ' · '): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
    .map((p) => p.trim())
    .join(separator);
}

/** "Jan 2021 – Present", "Jan 2021", or "" when there are no dates. */
export function dateRange(start: unknown, end: unknown): string {
  return joinParts([start, end], ' – ');
}

/** The names in a list for a section's subtitle, or the fallback when there are none. */
export function listSummary(names: unknown[], fallback: string): string {
  return joinParts(names, ', ') || fallback;
}

/** Asks before removing an entry that has something typed in it. */
export function confirmRemove(name: string): boolean {
  return window.confirm(`Remove ${name}? This can’t be undone.`);
}
