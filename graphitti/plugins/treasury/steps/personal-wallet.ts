import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

type TreasuryStepInput = StepInput & {
  _context?: {
    executionId?: string;
  };
};

async function getPersonalWallet(input: TreasuryStepInput) {
  const result = await requireLinkedWalletForExecution(
    input._context?.executionId
  );
  if (!result.success) {
    return fail(result.error.message);
  }

  return ok({
    walletId: result.wallet.privyWalletId,
    address: result.wallet.address,
    chainType: result.wallet.chainType,
  });
}

export async function getPersonalWalletStep(input: TreasuryStepInput) {
  "use step";
  return withStepLogging(input, () => getPersonalWallet(input));
}

export const _integrationType = "treasury";
