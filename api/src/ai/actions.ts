/**
 * The AI actions and what each costs in credits (docs/PLAN-2.0.md §3).
 * One list, read by the API (to charge) and sent to the app (to show prices
 * on the buttons), so the two can never disagree.
 */
export const AI_ACTIONS = {
  import: { credits: 100, label: 'Import a resume file' },
  projects: { credits: 50, label: 'Read GitHub / GitLab projects' },
  tailor: { credits: 40, label: 'Tailor to a job advert' },
  summary: { credits: 10, label: 'Write the summary' },
  bullet: { credits: 5, label: 'Improve a bullet point' },
} as const;

export type AiAction = keyof typeof AI_ACTIONS;

export const isAiAction = (value: string): value is AiAction => Object.hasOwn(AI_ACTIONS, value);
