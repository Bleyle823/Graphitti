import "server-only";

import { withPluginMetrics } from "@/lib/metrics/instrumentation/plugin";
import { withStepValueCap } from "@/lib/execute/value-ledger";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import {
  applyFailOnError,
  type WriteContractCoreInput,
  type WriteContractResult,
  writeContractCore,
} from "./write-contract-core";

export type WriteContractInput = StepInput &
  WriteContractCoreInput & {
    failOnError?: boolean;
  };

export async function writeContractStep(
  input: WriteContractInput
): Promise<WriteContractResult> {
  "use step";

  return withPluginMetrics(
    {
      pluginName: "web3",
      actionName: "write-contract",
      executionId: input._context?.executionId,
    },
    () =>
      withStepLogging(input, async () => {
        let coreResult: WriteContractResult | undefined;
        const result = await withStepValueCap(
          {
            organizationId: input._context?.organizationId,
            stepFunction: "writeContractStep",
            config: { ethValue: input.ethValue },
            executionId: input._context?.executionId,
          },
          async () => {
            coreResult = await writeContractCore(input);
            return coreResult;
          }
        );
        return result === coreResult
          ? applyFailOnError(result, input.failOnError)
          : result;
      })
  );
}

writeContractStep.maxRetries = 0;

export const _integrationType = "web3";
