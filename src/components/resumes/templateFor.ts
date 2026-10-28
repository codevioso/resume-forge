import { templates } from '../../data/templates';
import type { Template } from '../../types/resume';

/** A saved resume's template; the first one if its id is no longer in the registry. */
export const templateFor = (id: string): Template => templates.find((t) => t.id === id) ?? templates[0];
