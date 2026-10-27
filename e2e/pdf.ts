import type { Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-expect-error — plain ESM from the service, no type declarations.
import { validateRenderRequest } from '../pdf-service/lib/validate.mjs';
import { PDF_EXPORT_STORAGE_KEY } from '../src/constants/pdfExport';
import type { ResumeData, Template } from '../src/types/resume';

/**
 * Renders a resume to a real PDF exactly the way the pdf-service does.
 *
 * The snapshot goes through the service's own request validation first, so
 * the template sees what it would see in production. That is not a nicety:
 * the service once clamped skill levels to 0–5 while the editor stores 0–100,
 * and a test that skipped validation passed over every sliver-thin skill bar.
 */
export async function renderPdf(page: Page, template: Template, resumeData: ResumeData) {
  const parsed = validateRenderRequest({ snapshot: { selectedTemplate: template, resumeData } });
  if (!parsed.ok) throw new Error(`fixture rejected by the pdf-service: ${parsed.error}`);

  await page.addInitScript(
    ({ key, data }) => window.sessionStorage.setItem(key, JSON.stringify(data)),
    { key: PDF_EXPORT_STORAGE_KEY, data: parsed.snapshot },
  );
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto('/print');
  await page.waitForSelector('[data-print-ready="true"]');
  // Must match pdf-service/lib/renderer.mjs. If these drift, the tests check
  // a different PDF from the one users download.
  return page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
}

/**
 * Text compared without whitespace or case. Templates set headings and names
 * in letter-spaced capitals, and the PDF's text layer then holds "S A M L E E"
 * for "Sam Lee": the words are on the page, only spaced. Matching on the
 * squashed form tests what the reader sees, not how the glyphs were laid out.
 */
export const squash = (s: string) => s.replace(/\s+/g, '').toUpperCase();

/** Page count, squashed text of every page, and every link target in the PDF. */
export async function readPdf(bytes: Buffer) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages: string[] = [];
  const links: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
    for (const a of await page.getAnnotations()) {
      if (a.subtype === 'Link') links.push(a.url ?? a.unsafeUrl ?? '');
    }
  }
  return { pageCount: doc.numPages, text: squash(pages.join(' ')), links };
}
