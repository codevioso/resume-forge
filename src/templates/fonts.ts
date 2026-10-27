/**
 * Font stacks for the templates.
 *
 * **Every stack leads with a family bundled in `src/styles/fonts.css`.** The
 * PDF is rendered in a Linux container that cannot fetch fonts from the
 * internet and has none of the Microsoft fonts these stacks used to fall back
 * to, so a stack that leads with a system font renders one typeface in the
 * on-screen preview and another in the PDF. That is the whole accuracy bug.
 *
 * Georgia and Times New Roman are replaced by Gelasio, which was drawn to be
 * metric-compatible with Georgia: line breaks and page breaks land where the
 * Georgia layout put them, without shipping a font that cannot be redistributed.
 * The system names stay at the end of each stack only as a last resort.
 */
export const templateFonts = {
  modern: "'Inter', 'Segoe UI', sans-serif",
  minimal: "'Playfair Display', 'Gelasio', Georgia, serif",
  creative: "'Inter', 'Segoe UI', sans-serif",
  executive: "'Gelasio', Georgia, 'Times New Roman', serif",
  tech: "'Source Code Pro', 'Courier New', monospace",
  sans: "'Inter', system-ui, sans-serif",
  serif: "'Gelasio', Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Consolas', monospace",
} as const;
