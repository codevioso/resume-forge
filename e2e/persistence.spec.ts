import { expect, test } from '@playwright/test';
import { RESUME_STORAGE_KEY } from '../src/context/resumeStorage';
import { templates } from '../src/templates/registry';

const nameOf = (id: string) => templates.find((t) => t.id === id)!.name;

/**
 * The resume survives a reload. Before this, a refresh, a closed tab or a
 * browser crash silently threw away everything the user had typed.
 */

test('the resume and the chosen template survive a reload', async ({ page }) => {
  await page.goto('/templates');
  await page.getByRole('heading', { name: nameOf('ocean'), level: 3 }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/editor$/);

  await page.getByPlaceholder('John Doe').fill('Priya Raman');
  await page.getByPlaceholder('Senior Software Engineer').fill('Data Engineer');
  await expect(page.getByText('Saved in this browser')).toBeVisible();

  await page.reload();

  // Still on the editor (it redirects to /templates when no template is chosen).
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByPlaceholder('John Doe')).toHaveValue('Priya Raman');
  await expect(page.getByPlaceholder('Senior Software Engineer')).toHaveValue('Data Engineer');
  await expect(page.getByRole('button', { name: nameOf('ocean'), exact: true })).toBeVisible();
});

test('a saved resume from an older or damaged save still opens', async ({ page }) => {
  // Missing lists and wrong types must not crash the templates on load.
  await page.addInitScript((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ v: 1, templateId: 'modern', resumeData: { personalInfo: { fullName: 'Lee Park', phone: 5550100 }, skills: 'none' } }),
    );
  }, RESUME_STORAGE_KEY);
  await page.goto('/editor');
  await expect(page.getByPlaceholder('John Doe')).toHaveValue('Lee Park');
});

test('clearing asks first, and keeps the resume when the user says no', async ({ page }) => {
  await page.goto('/templates');
  await page.getByRole('heading', { name: nameOf('modern'), level: 3, exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByPlaceholder('John Doe').fill('Sam Okafor');

  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByPlaceholder('John Doe')).toHaveValue('Sam Okafor');

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByPlaceholder('John Doe')).toHaveValue('');
});
