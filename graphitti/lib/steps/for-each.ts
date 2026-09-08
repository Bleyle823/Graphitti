/**
 * Executable step function for For Each action
 */
import "server-only";

import { type StepInput, withStepLogging } from "./step-handler";

export type ForEachInput = StepInput & {
  arraySource?: string;
  /** Resolved item count (set by executor before calling) */
  itemCount?: number;
};

type ForEachResult = {
  itemCount: number;
  completed: boolean;
};

function evaluateForEach(input: ForEachInput): ForEachResult {
  return {
    itemCount: input.itemCount ?? 0,
    completed: true,
  };
}

// biome-ignore lint/suspicious/useAwait: workflow "use step" requires async
export async function forEachStep(
  input: ForEachInput
): Promise<ForEachResult> {
  "use step";
  return withStepLogging(input, () =>
    Promise.resolve(evaluateForEach(input))
  );
}
forEachStep.maxRetries = 0;
