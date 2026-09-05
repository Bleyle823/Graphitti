import "server-only";

import { getAddressUrl } from "@/lib/explorer";
import { getExplorerConfigForNetwork } from "@/lib/explorer/chain-explorer";

import { withPluginMetrics } from "@/lib/metrics/instrumentation/plugin";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { MULTICALL3_ADDRESS } from "@/lib/contracts/multicall3";
import {
  applyBatchFailOnError,
  type BatchWriteContractCoreInput,
  type BatchWriteContractResult,
  batchWriteContractCore,
} from "./batch-write-contract-core";

export type BatchWriteContractInput = StepInput &
  BatchWriteContractCoreInput & {
    // Mirrors write-contract's failOnError. Defaults to true. See
    // applyBatchFailOnError in batch-write-contract-core.ts for exactly
    // which failures qualify to be softened.
    failOnError?: boolean;
  };

/**
 * Batch Write Contract Step
 * Sends multiple state-changing calls as a single atomic transaction via
 * Multicall3's aggregate3
 */
export async function batchWriteContractStep(
  input: BatchWriteContractInput
): Promise<BatchWriteContractResult> {
  "use step";

  // Enrich input with the Multicall3 explorer link for the execution log.
  // There is no single per-node contractAddress in this action (each call
  // targets a different contract), so the resolved chain's Multicall3
  // address is the only address worth linking here.
  let enrichedInput: BatchWriteContractInput & { multicallAddressLink?: string } =
    input;
  try {
    const explorerConfig = getExplorerConfigForNetwork(input.network);
    if (explorerConfig) {
      const multicallAddressLink = getAddressUrl(explorerConfig, MULTICALL3_ADDRESS);
      if (multicallAddressLink) {
        enrichedInput = { ...input, multicallAddressLink };
      }
    }
  } catch {
    // Non-critical: if lookup fails, input logs without the link
  }

  return withPluginMetrics(
    {
      pluginName: "web3",
      actionName: "batch-write-contract",
      executionId: input._context?.executionId,
    },
    () =>
      withStepLogging(enrichedInput, async () => {
        const result = await batchWriteContractCore(input);
        return applyBatchFailOnError(result, input.failOnError);
      })
  );
}

batchWriteContractStep.maxRetries = 0;

export const _integrationType = "web3";

