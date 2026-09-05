import "server-only";

import { withPluginMetrics } from "@/lib/metrics/instrumentation/plugin";
import { withStepValueCap } from "@/lib/execute/value-ledger";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type {
  TransferFundsCoreInput,
  TransferFundsResult,
} from "./transfer-funds-core";
import { transferFundsCore } from "./transfer-funds-core";

export type {
  TransferFundsCoreInput,
  TransferFundsResult,
} from "./transfer-funds-core";

export type TransferFundsInput = StepInput & TransferFundsCoreInput;

export async function transferFundsStep(
  input: TransferFundsInput
): Promise<TransferFundsResult> {
  "use step";

  return withPluginMetrics(
    {
      pluginName: "web3",
      actionName: "transfer-funds",
      executionId: input._context?.executionId,
    },
    () =>
      withStepLogging(input, () =>
        withStepValueCap(
          {
            organizationId: input._context?.organizationId,
            stepFunction: "transferFundsStep",
            config: { network: input.network, amount: input.amount },
            executionId: input._context?.executionId,
          },
          () => transferFundsCore(input)
        )
      )
  );
}

transferFundsStep.maxRetries = 0;

export const _integrationType = "web3";
