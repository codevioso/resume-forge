import { expect, test } from '@playwright/test';
import { templates } from '../src/templates/registry';
import { fullResume, fullResumeExpectations, fullResumeLinks } from './fixtures/resumes';
import { readPdf, renderPdf, squash } from './pdf';

/**
 * Every template prints every field the user fills in (THE FIELD RULE in
 * src/templates/fields.tsx), and contact details and project links are
 * clickable in the PDF.
 *
 * Before this, most templates silently left out some of what the editor asked
 * for — LinkedIn and website in most, GPA and project links in all, phone,
 * location or job dates in several — so a user filled in a field and it never
 * reached their resume.
 */

test.describe('fields', () => {
  for (const template of templates) {
    test(`${template.id}: every filled-in field reaches the PDF`, async ({ page }) => {
      const { text, links } = await readPdf(await renderPdf(page, template, fullResume));

      const missing = Object.entries(fullResumeExpectations)
        .filter(([, expected]) => !text.includes(squash(expected)))
        .map(([field]) => field);
      expect.soft(missing, `${template.id} does not print these fields`).toEqual([]);

      const unlinked = fullResumeLinks.filter((href) => !links.some((l) => l.replace(/\/$/, '') === href));
      expect(unlinked, `${template.id} does not make these clickable`).toEqual([]);
    });
  }
});
