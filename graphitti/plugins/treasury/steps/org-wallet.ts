import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getOrganizationWallet } from "@/lib/web3/wallet-helpers";
import { resolveOrganizationContext } from "@/lib/web3/resolve-org-context";

type TreasuryStepInput = StepInput & {
  _context?: {
    executionId?: string;
    organizationId?: string;
  };
};

async function getOrgWallet(input: TreasuryStepInput) {
  const orgContext = await resolveOrganizationContext(
    input._context ?? {},
    "[Treasury]",
    "get-org-wallet"
  );
  if (!orgContext.success) {
    return fail(orgContext.error);
  }

  const wallet = await getOrganizationWallet(orgContext.organizationId);
  return ok({
    walletId: wallet.privyWalletId,
    address: wallet.address,
    autoSpendCapUsdc: wallet.autoSpendCapUsdc,
    autoPolicyId: wallet.autoPolicyId,
    humanPolicyId: wallet.humanPolicyId,
  });
}

export async function getOrgWalletStep(input: TreasuryStepInput) {
  "use step";
  return withStepLogging(input, () => getOrgWallet(input));
}

export const _integrationType = "treasury";
