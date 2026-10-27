import type { CSSProperties } from 'react';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../constants/layout';

/**
 * Pagination primitives every template is built from.
 *
 * THE PAGINATION RULE — read before writing or changing a template.
 *
 * A resume is as long as its content. Templates used to be fixed 794×1123
 * canvases with `overflow: hidden`, which meant anything past the first page
 * was not moved to a second page but cut off and thrown away, silently. On a
 * long resume that lost whole jobs, every project and every certification,
 * with no warning to the user. Measured on the Modern template: 10 of 35
 * entries lost.
 *
 * Chromium paginates for us when it prints, so a template's job is only to
 * say where it is safe to break:
 *
 * 1. The root is `pageRoot`: one A4 page wide, at least one page tall, and
 *    free to grow. Never give a template a fixed height or `overflow: hidden`.
 *    That is the bug this file exists to prevent.
 * 2. Every entry — a job, a degree, a project, a certificate, a skill row — is
 *    `keepTogether`, so it moves to the next page whole rather than splitting
 *    with its title on one page and its description on the next.
 * 3. Every section heading is `keepWithNext`, so a heading is never left alone
 *    at the foot of a page with its content starting overleaf.
 * 4. A column that carries padding uses `repeatPadding`, so its top and bottom
 *    padding are applied on every page it spans. Without it, page two starts
 *    flush against the paper's top edge.
 * 5. A column with its own background (a dark sidebar) must be a flex child
 *    that stretches to the full height of the root. Its background then
 *    continues on every page instead of stopping where page one ended.
 * 6. That alone stops where the content stops, so on the last page the column
 *    ends part-way down. A template with a full-bleed column also renders
 *    `<PageBackdrop>` (see `PageBackdrop.tsx`), which paints the column on the
 *    document canvas so every page gets it top to bottom.
 *
 * The on-screen preview shows the same document with page guides drawn at
 * every A4 boundary. The PDF is authoritative: rule 2 can push an entry to the
 * next page in print that the screen draws straddling the guide.
 */

/** Root of every template. Grows to as many pages as the content needs. */
export const pageRoot: CSSProperties = {
  width: A4_WIDTH_PX,
  minHeight: A4_HEIGHT_PX,
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
};

/** Rule 2. An entry moves to the next page whole. */
export const keepTogether: CSSProperties = {
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
};

/** Rule 3. A heading stays with the content under it. */
export const keepWithNext: CSSProperties = {
  breakAfter: 'avoid',
  pageBreakAfter: 'avoid',
};

/** Rule 4. Padding repeats at the top and bottom of every page a column spans. */
export const repeatPadding: CSSProperties = {
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone',
};
