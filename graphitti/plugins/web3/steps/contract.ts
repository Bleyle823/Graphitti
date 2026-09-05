import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { ethCall } from "@/lib/web3/rpc";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type ContractInput = StepInput & {
  network: string;
  contractAddress: string;
  data: string;
  value?: string;
};

async function readHandler(input: ContractInput) {
  if (!input.contractAddress || !input.data) {
    return fail("Contract address and calldata are required");
  }
  try {
    const result = await ethCall({
      network: input.network,
      to: input.contractAddress,
      data: input.data,
    });
    return ok({ result });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function writeHandler(input: ContractInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.contractAddress || !input.data) {
    return fail("Contract address and calldata are required");
  }
  try {
    const chain = requireChain(input.network);
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: input.contractAddress,
      data: input.data,
      value: input.value,
    });
    return ok({
      hash,
      from: wallet.wallet.address,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function readContractStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => readHandler(input));
}

export async function writeContractStep(input: ContractInput) {
  "use step";
  return withStepLogging(input, () => writeHandler(input));
}

export const _integrationType = "web3";
