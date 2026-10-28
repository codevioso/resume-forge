---
name: paperplane-template
description: Add or modify a Paperplane resume template (registry, component, gallery, PDF parity).
---

# Add a Paperplane template

## 1. Pick an id

- Use **kebab-case**, stable string (e.g. `aurora`, `ledger`). It appears in URLs and `templateComponents`.

## 2. Metadata

In [src/templates/registry.ts](src/templates/registry.ts):

- Append a `meta(...)` entry to the `templates` array with `id`, `name`, `description`, `category`, `bestFor`, and `colors`.
- Append `yourId: YourTemplateComponent` to `templateComponents`.

## 3. Component

- Add `YourTemplate.tsx` under `src/templates/<id>/` or a shared file under `src/templates/additional/` if it is a small variant batch.
- Call `useResume()` from [ResumeContext](src/context/ResumeContext.tsx).
- Follow **THE PAGINATION RULE** in [paging.ts](src/templates/paging.ts). In short: the root is `...pageRoot` (one A4 page wide, at least one tall, grows with content — never a fixed height or `overflow: hidden`); every entry is `keepTogether`; every heading is `keepWithNext`; padded columns use `repeatPadding`; a full-bleed sidebar or tinted page also renders `<PageBackdrop>` ([PageBackdrop.tsx](src/templates/PageBackdrop.tsx)). [ModernTemplate](src/templates/modern/ModernTemplate.tsx) is the reference.
- Follow **THE FIELD RULE** in [fields.tsx](src/templates/fields.tsx): print every field the editor collects — contact details (email, phone, location, LinkedIn, website), job and education dates, degree and field, GPA, project technologies, description and link, custom items' subtitle and description. Use its helpers: `dateRange` (a current job reads "Present", no dangling separators), `degreeLine`, `gpaText`, `joinParts`, and `ContactLink` for email, phone and every URL so they are clickable in the PDF. Blank fields render nothing.
- Use inline styles or existing patterns; use the font stacks in [fonts.ts](src/templates/fonts.ts). Fonts are bundled (`src/styles/fonts.css`); do not add a font that is not bundled there, or the PDF falls back to whatever the server has.

## 4. Verify

- Gallery: [TemplatesPage](src/pages/TemplatesPage.tsx) picks up the registry automatically; thumbnail uses [TemplateThumbnail](src/components/TemplateThumbnail.tsx) + [sampleResume](src/data/sampleResume.ts).
- Editor: select the template; the preview draws a dashed guide at every A4 page boundary. The PDF is printed from the same components via the `/print` route.
- Run `npm run build` and `npx playwright test`. `e2e/pagination.spec.ts` picks up the new template from the registry and fails if a long resume loses any entry or does not run onto more pages, or a short one is not exactly one page.

## 5. PR checklist

- [ ] `templates` array + `templateComponents` updated
- [ ] No duplicate fake mini-previews in the gallery
- [ ] `e2e/pagination.spec.ts` passes for the template (long and short)
- [ ] `e2e/fields.spec.ts` passes for the template (every field printed, links clickable)
- [ ] Looked at the long-resume PDF: no entry split across pages, columns run to the foot of every page
