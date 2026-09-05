import "server-only";

import { getAddressUrl } from "@/lib/explorer";
import { getExplorerConfigForNetwork } from "@/lib/explorer/chain-explorer";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type {
  ApproveTokenCoreInput,
  ApproveTokenResult,
} from "./approve-token-core";
import { approveTokenCore } from "./approve-token-core";

export type {
  ApproveTokenCoreInput,
  ApproveTokenResult,
} from "./approve-token-core";

export type ApproveTokenInput = StepInput & ApproveTokenCoreInput;

/**
 * Approve Token Step
 * Calls ERC20 approve(spender, amount) to grant spending permission on the selected token
 */
export async function approveTokenStep(
  input: ApproveTokenInput
): Promise<ApproveTokenResult> {
  "use step";

  let enrichedInput: ApproveTokenInput & { spenderAddressLink?: string } =
    input;
  try {
    const explorerConfig = getExplorerConfigForNetwork(input.network);
    if (explorerConfig) {
      const spenderAddressLink = getAddressUrl(
        explorerConfig,
        input.spenderAddress
      );
      if (spenderAddressLink) {
        enrichedInput = { ...input, spenderAddressLink };
      }
    }
  } catch {
    // Non-critical: if lookup fails, input logs without the link
  }

  return withStepLogging(enrichedInput, () => approveTokenCore(input));
}

approveTokenStep.maxRetries = 0;

export const _integrationType = "web3";

