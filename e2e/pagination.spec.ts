import { expect, test, type Page } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDF_EXPORT_STORAGE_KEY } from '../src/constants/pdfExport';
import { templates } from '../src/templates/registry';
import type { ResumeData, Template } from '../src/types/resume';
import { longResume, longResumeMarkers, shortResume } from './fixtures/resumes';

/**
 * Every template paginates, and nothing the user typed is lost.
 *
 * This drives the real `/print` route through real Chromium and produces the
 * real PDF with the same options the pdf-service uses — then reads the text
 * back out of the PDF. It does not inspect the DOM: before pagination every
 * entry existed in the DOM and was still cut off the page, so a DOM check
 * would have passed over the exact bug this guards against.
 *
 * The template list comes from the registry, so a new template is covered the
 * moment it is registered.
 */

async function renderPdf(page: Page, template: Template, resumeData: ResumeData) {
  await page.addInitScript(
    ({ key, data }) => window.sessionStorage.setItem(key, JSON.stringify(data)),
    { key: PDF_EXPORT_STORAGE_KEY, data: { selectedTemplate: template, resumeData } },
  );
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto('/print');
  await page.waitForSelector('[data-print-ready="true"]');
  // Must match pdf-service/lib/renderer.mjs. If these drift, this test checks
  // a different PDF from the one users download.
  return page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
}

async function readPdf(bytes: Buffer) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  return { pageCount: doc.numPages, text: squash(pages.join(' ')), pages };
}

/**
 * Text compared without whitespace or case. Templates set headings and names
 * in letter-spaced capitals, and the PDF's text layer then holds "S A M L E E"
 * for "Sam Lee": the words are on the page, only spaced. Matching on the
 * squashed form tests what the reader sees, not how the glyphs were laid out.
 */
const squash = (s: string) => s.replace(/\s+/g, '').toUpperCase();

test.describe('pagination', () => {
  for (const template of templates) {
    test(`${template.id}: a long resume flows onto more pages and loses nothing`, async ({ page }) => {
      const { pageCount, text } = await readPdf(await renderPdf(page, template, longResume));

      const missing = longResumeMarkers.filter((m) => !text.includes(squash(m)));
      expect(missing, `${template.id} dropped content from the PDF`).toEqual([]);
      expect(pageCount, `${template.id} should need more than one page`).toBeGreaterThan(1);
    });

    test(`${template.id}: a short resume is exactly one page`, async ({ page }) => {
      // The failure this catches is the opposite one: a template that pads or
      // sizes itself so that even a one-job resume spills a blank second page.
      const { pageCount, text } = await readPdf(await renderPdf(page, template, shortResume));
      expect(text).toContain(squash('Sam Lee'));
      expect(pageCount, `${template.id} printed a short resume on more than one page`).toBe(1);
    });
  }
});
