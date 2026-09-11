import "server-only";

import { resolveOrganizationContext } from "@/lib/web3/resolve-org-context";
import {
  getLinkedWallet,
  getUserIdFromExecution,
  NO_WALLET_ERROR,
} from "@/lib/web3/user-wallet";
import { getOrganizationPrivyWalletId } from "@/lib/web3/wallet-helpers";
import { isUnresolvedWalletId } from "@/lib/workflow/bind-org-wallet-nodes";

type StepContext = {
  executionId?: string;
  organizationId?: string;
};

function prefersOrgTreasuryWallet(walletId: string): boolean {
  return walletId.includes("Get org wallet");
}

function prefersPersonalWallet(walletId: string): boolean {
  return walletId.includes("Get personal wallet");
}

async function resolveOrgTreasuryWalletId(
  context: StepContext
): Promise<
  { success: true; walletId: string } | { success: false; error: string }
> {
  const orgContext = await resolveOrganizationContext(
    context,
    "[Treasury]",
    "resolve-wallet"
  );
  if (!orgContext.success) {
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

async function resolvePersonalWalletId(
  executionId: string | undefined
): Promise<
  { success: true; walletId: string } | { success: false; error: string }
> {
  const userId = await getUserIdFromExecution(executionId);
  if (!userId) {
    return {
      success: false,
      error:
        "Could not resolve the workflow owner. Run this workflow from the app after signing in.",
    };
  }

  const wallet = await getLinkedWallet(userId);
  if (!wallet) {
    return { success: false, error: NO_WALLET_ERROR.error.message };
  }

  return { success: true, walletId: wallet.privyWalletId };
}

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

  if (current && prefersOrgTreasuryWallet(current)) {
    return resolveOrgTreasuryWalletId(input._context ?? {});
  }

  if (current && prefersPersonalWallet(current)) {
    return resolvePersonalWalletId(input._context?.executionId);
  }

  const personal = await resolvePersonalWalletId(input._context?.executionId);
  if (personal.success) {
    return personal;
  }

  if (!current || isUnresolvedWalletId(current)) {
    return personal;
  }

  return resolveOrgTreasuryWalletId(input._context ?? {});
}
