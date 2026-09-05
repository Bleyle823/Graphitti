import "server-only";

import { withPluginMetrics } from "@/lib/metrics/instrumentation/plugin";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import {
  type ReadContractCoreInput,
  type ReadContractResult,
  readContractCore,
} from "./read-contract-core";

export type ReadContractInput = StepInput & ReadContractCoreInput;

export async function readContractStep(
  input: ReadContractInput
): Promise<ReadContractResult> {
  "use step";

  return withPluginMetrics(
    {
      pluginName: "web3",
      actionName: "read-contract",
      executionId: input._context?.executionId,
    },
    () => withStepLogging(input, () => readContractCore(input))
  );
}

readContractStep.maxRetries = 0;

export const _integrationType = "web3";
