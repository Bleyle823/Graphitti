import "server-only";

import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import {
  type RankTopTwoCoreInput,
  rankTopTwoHandler,
} from "./rank-top-two-core";

export type { RankTopTwoCoreInput } from "./rank-top-two-core";
export {
  findRosterAddress,
  normalizeKey,
  rankTopTwoHandler,
} from "./rank-top-two-core";

export type RankTopTwoInput = StepInput & RankTopTwoCoreInput;

export async function rankTopTwoStep(input: RankTopTwoInput) {
  "use step";
  return withStepLogging(input, () => Promise.resolve(rankTopTwoHandler(input)));
}

export const _integrationType = "fantasy-premier-league";
