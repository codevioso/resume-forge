import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import type { Education } from '../types/resume';

/**
 * Formatting every template shares, so a field reads the same whichever
 * design prints it.
 *
 * THE FIELD RULE: a template prints every field the editor collects —
 * contact details, dates, degree and field of study, GPA, project links and
 * technologies, every custom item's subtitle and description. A design may
 * choose where and how small, never whether. `e2e/fields.spec.ts` checks every
 * template against a resume with every field filled in.
 */

/**
 * "Jan 2020 – Present", "Jan 2020 – Mar 2022", or whichever side exists.
 * Never a dangling separator when a date was left blank.
 */
export function dateRange(start?: string, end?: string, current?: boolean, sep = ' – '): string {
  const from = start?.trim() ?? '';
  const to = current ? 'Present' : (end?.trim() ?? '');
  if (from && to) return `${from}${sep}${to}`;
  return from || to;
}

/** Non-empty parts joined: `joinParts(['BSc', '', 'GPA 3.8'])` → "BSc · GPA 3.8". */
export function joinParts(parts: Array<string | undefined | null | false>, sep = ' · '): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(sep);
}

/** "BSc in Computer Science", or whichever of the two was filled in. */
export function degreeLine(edu: Pick<Education, 'degree' | 'field'>): string {
  return joinParts([edu.degree, edu.field], ' in ');
}

/** "GPA 3.8", or empty. */
export function gpaText(gpa?: string): string {
  const g = gpa?.trim();
  return g ? `GPA ${g}` : '';
}

type LinkKind = 'email' | 'phone' | 'url';

/**
 * The href for a contact value, or undefined when it is not usable as one.
 * A URL without a scheme gets https:// — so a value can never become a
 * `javascript:` link.
 */
export function contactHref(kind: LinkKind, value?: string): string | undefined {
  const v = value?.trim() ?? '';
  if (!v) return undefined;
  if (kind === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : undefined;
  if (kind === 'phone') {
    const dial = v.replace(/[^\d+]/g, '');
    return dial.replace(/\D/g, '').length >= 5 ? `tel:${dial}` : undefined;
  }
  if (/\s/.test(v) || !v.includes('.')) return undefined;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/**
 * A URL as a resume prints it: "johndoe.com/work", not
 * "https://johndoe.com/work/". The link itself keeps the full address.
 */
export function displayUrl(value?: string): string {
  return (value ?? '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/**
 * True inside previews that sit in something clickable (gallery cards, the
 * landing page's showcase): there a contact link renders as plain text, since
 * a link inside a link is invalid HTML. The editor preview and the PDF keep
 * real links.
 */
export const StaticLinks = createContext(false);

/**
 * A contact value that is a working link in the PDF (and opens in a new tab
 * from the preview, so a click never leaves the editor). Styled exactly like
 * the text around it unless `style` says otherwise. A URL is shown without its
 * scheme (`displayUrl`) unless `children` gives other text.
 */
export function ContactLink({
  kind,
  value,
  style,
  children,
}: {
  kind: LinkKind;
  value?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const content = children ?? (kind === 'url' ? displayUrl(value) : value);
  const href = contactHref(kind, value);
  const isStatic = useContext(StaticLinks);
  if (!href || isStatic) return <span style={style}>{content}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', ...style }}>
      {content}
    </a>
  );
}
