import "server-only";

import { withPluginMetrics } from "@/lib/metrics/instrumentation/plugin";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type {
  TransferTokenCoreInput,
  TransferTokenResult,
} from "./transfer-token-core";
import { transferTokenCore } from "./transfer-token-core";

export type {
  TransferTokenCoreInput,
  TransferTokenResult,
} from "./transfer-token-core";

export type TransferTokenInput = StepInput & TransferTokenCoreInput;

export async function transferTokenStep(
  input: TransferTokenInput
): Promise<TransferTokenResult> {
  "use step";

  return withPluginMetrics(
    {
      pluginName: "web3",
      actionName: "transfer-token",
      executionId: input._context?.executionId,
    },
    () => withStepLogging(input, () => transferTokenCore(input))
  );
}

transferTokenStep.maxRetries = 0;

export const _integrationType = "web3";
