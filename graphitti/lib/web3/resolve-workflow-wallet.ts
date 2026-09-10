import "server-only";

import { resolveOrganizationContext } from "@/lib/web3/resolve-org-context";
import { getOrganizationPrivyWalletId } from "@/lib/web3/wallet-helpers";
import { isUnresolvedWalletId } from "@/lib/workflow/bind-org-wallet-nodes";

type StepContext = {
  executionId?: string;
  organizationId?: string;
};

export async function resolveStepWalletId(input: {
  walletId?: string;
  _context?: StepContext;
}): Promise<
  { success: true; walletId: string } | { success: false; error: string }
> {
  const current = input.walletId?.trim() ?? "";
  const unresolved = isUnresolvedWalletId(current) || current.includes("{{");

  if (current && !unresolved) {
    return { success: true, walletId: current };
  }

  const orgContext = await resolveOrganizationContext(
    input._context ?? {},
    "[Treasury]",
    "resolve-wallet"
  );
  if (!orgContext.success) {
    if (current && !unresolved) {
      return { success: true, walletId: current };
    }
    return { success: false, error: orgContext.error };
  }

  try {
    const walletId = await getOrganizationPrivyWalletId(
      orgContext.organizationId
    );
    return { success: true, walletId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "No treasury wallet found for organization",
    };
  }
}
