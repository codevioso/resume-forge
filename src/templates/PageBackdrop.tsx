import { A4_WIDTH_PX } from '../constants/layout';

/**
 * Rule 6 of THE PAGINATION RULE (see `paging.ts`): a full-bleed column
 * background reaches the foot of every page, the last one included.
 *
 * A sidebar's own background only covers the sidebar box, and the box is as
 * tall as the content. On a three-page resume whose content ends 100px into
 * page three, the sidebar became a dark stub and then white paper — measured,
 * not hypothetical.
 *
 * Chromium paints the document canvas (the `html`/`body` background) across
 * the full area of every printed page. Giving the canvas a gradient that only
 * varies horizontally draws the same column stripe on every page, top to
 * bottom, however much content that page holds.
 *
 * Render this once inside a template that has a full-bleed column, passing a
 * CSS background that matches the column: for a 260px dark sidebar,
 * `linear-gradient(to right, #1e293b 0 260px, #ffffff 260px)`.
 *
 * Render it as a direct child of the template root. Print only: on screen the
 * template's own column background already spans the whole document, and
 * touching the app's `body` would repaint the editor.
 */
export function PageBackdrop({ background }: { background: string }) {
  // The element holding this backdrop is the template root. In print it gives
  // up its own background, because the canvas now paints the same thing. If it
  // kept it, its bottom edge on the last page would fall at a fractional pixel
  // and anti-alias into a light hairline across a dark design.
  return (
    <style data-page-backdrop>
      {`@media print {
  html, body { background: ${background} !important; }
  :has(> style[data-page-backdrop]) { background: transparent !important; }
}`}
    </style>
  );
}

/**
 * The background for a template with a full-bleed column down the left edge.
 *
 * The column is a solid-colour image tile exactly `width` px wide, repeated
 * down the pages, over the page colour. Not a hard-stop gradient such as
 * `linear-gradient(to right, c 0 260px, white 260px)`: a PDF viewer smooths a
 * gradient's colour stop over a pixel or two, so below the last line of content
 * — where only this backdrop draws the column — its edge came out soft next to
 * the crisp edge of the column element above it. A tile's edge is as sharp as
 * an element's.
 *
 * If you measure a rendered page and find a dark column at its very right
 * edge, check the resolution before chasing it. An A4 page is 793.28px wide at
 * 96dpi, so a rasteriser's last pixel column there is mostly *outside* the page
 * and comes back as a blended edge colour. It is not in the PDF: at 300dpi the
 * same page has no such line. That artifact cost three rounds of wrong fixes
 * here once already.
 */
export function leftColumn(color: string, width: number, rest = '#ffffff') {
  return columnAt(0, color, width, rest);
}

/** As `leftColumn`, for a column down the right edge of the page. */
export function rightColumn(color: string, width: number, rest = '#ffffff') {
  return columnAt(A4_WIDTH_PX - width, color, width, rest);
}

function columnAt(x: number, color: string, width: number, rest: string) {
  return `linear-gradient(${color}, ${color}) ${x}px 0 / ${width}px 100% repeat-y ${rest}`;
}
