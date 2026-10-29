/**
 * The model behind the AI actions, as an interface: the real client calls
 * Claude (added with the first real action, phase 2); tests and local
 * development use `fakeModel`, which costs nothing and answers predictably.
 */

export type ModelUsage = { inputTokens: number; outputTokens: number };

export type ModelResult<T> = { output: T; usage: ModelUsage; model: string };

export interface AiModel {
  /** Model id recorded with each request, e.g. "claude-haiku-5-5". */
  readonly id: string;
  /** Price per million tokens in micro-dollars, for the cost log. */
  readonly pricePerMillion: { input: number; output: number };
}

/** Cost of one request in millionths of a US dollar. */
export function costMicroUsd(model: AiModel, usage: ModelUsage): number {
  return Math.round(
    (usage.inputTokens * model.pricePerMillion.input + usage.outputTokens * model.pricePerMillion.output) / 1_000_000,
  );
}

/** Claude Haiku 5.5: $0.10 in / $0.50 out per million tokens (prompts under 100K tokens). */
export const HAIKU_5_5_PRICE = { input: 100_000, output: 500_000 };

export const fakeModel: AiModel = { id: 'fake-model', pricePerMillion: HAIKU_5_5_PRICE };
