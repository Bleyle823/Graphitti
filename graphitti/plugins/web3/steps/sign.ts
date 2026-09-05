import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { requireChain } from "@/lib/web3/chains";
import { signTypedDataV4 } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type SignTypedInput = StepInput & {
  network: string;
  typedData: string;
};

async function handler(input: SignTypedInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.typedData) {
    return fail("typedData JSON is required");
  }
  try {
    const parsed = JSON.parse(input.typedData);
    const { signature } = await signTypedDataV4({
      walletId: wallet.wallet.privyWalletId,
      typedData: parsed,
      chain: requireChain(input.network),
    });
    return ok({ signature, address: wallet.wallet.address });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function signTypedDataStep(input: SignTypedInput) {
  "use step";
  return withStepLogging(input, () => handler(input));
}

export const _integrationType = "web3";
