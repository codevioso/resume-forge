import type { ResumeData, Template, TemplateCategory } from '../../types/resume';

export type CategoryFilterValue = 'all' | TemplateCategory;

/** Display order and labels of the gallery's category filters. */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  corporate: 'Corporate',
  creative: 'Creative',
  tech: 'Tech',
  minimal: 'Minimal',
  academic: 'Academic',
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as TemplateCategory[];

export function isCategory(value: string | null): value is TemplateCategory {
  return value !== null && value in CATEGORY_LABELS;
}

/** Templates the gallery marks as a good default choice. */
export const POPULAR_TEMPLATE_IDS = new Set(['modern']);

/** How many templates each filter would show. */
export function countByCategory(list: Template[]): Record<CategoryFilterValue, number> {
  const counts = { all: list.length } as Record<CategoryFilterValue, number>;
  for (const c of CATEGORY_ORDER) counts[c] = 0;
  for (const t of list) counts[t.category] += 1;
  return counts;
}

/**
 * Whether the user's own resume has enough in it to preview templates with.
 * Matches what ResumePreview needs before it stops showing its empty state.
 */
export function canPreviewWithOwnResume(data: ResumeData): boolean {
  const p = data.personalInfo;
  return Boolean(
    p.fullName?.trim() ||
      p.email?.trim() ||
      data.experiences.length > 0 ||
      data.education.length > 0 ||
      data.skills.length > 0,
  );
}
