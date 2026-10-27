import { expect, test } from '@playwright/test';
import { templates } from '../src/templates/registry';
import { longResume, longResumeMarkers, shortResume } from './fixtures/resumes';
import { readPdf, renderPdf, squash } from './pdf';

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
