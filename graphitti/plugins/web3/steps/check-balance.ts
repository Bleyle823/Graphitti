import "server-only";

import { ethers } from "ethers";
import { getAddressUrl } from "@/lib/explorer";
import { getExplorerConfigForNetwork } from "@/lib/explorer/chain-explorer";
import { withPluginMetrics } from "@/lib/metrics/instrumentation/plugin";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import { formatUnits, requireChain } from "@/lib/web3/chains";
import { ethGetBalance } from "@/lib/web3/rpc";

type CheckBalanceResult =
  | {
      success: true;
      balance: string;
      balanceWei: string;
      address: string;
      addressLink: string;
    }
  | { success: false; error: string };

export type CheckBalanceCoreInput = {
  network: string;
  address: string;
};

export type CheckBalanceInput = StepInput & CheckBalanceCoreInput;

async function stepHandler(
  input: CheckBalanceInput
): Promise<CheckBalanceResult> {
  const { network, address } = input;

  if (!ethers.isAddress(address)) {
    return { success: false, error: `Invalid address: ${address}` };
  }

  try {
    const chain = requireChain(network);
    const balanceWei = await ethGetBalance(network, ethers.getAddress(address));
    const balance = formatUnits(balanceWei, chain.nativeDecimals);
    const explorerConfig = getExplorerConfigForNetwork(network);
    const addressLink = getAddressUrl(explorerConfig, ethers.getAddress(address));

    return {
      success: true,
      balance,
      balanceWei,
      address: ethers.getAddress(address),
      addressLink,
    };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function checkBalanceStep(
  input: CheckBalanceInput
): Promise<CheckBalanceResult> {
  "use step";

  return withPluginMetrics(
    {
      pluginName: "web3",
      actionName: "check-balance",
      executionId: input._context?.executionId,
    },
    () => withStepLogging(input, () => stepHandler(input))
  );
}

checkBalanceStep.maxRetries = 0;

export const _integrationType = "web3";
