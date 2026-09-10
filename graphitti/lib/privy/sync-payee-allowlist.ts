import "server-only";

import { getOrgTreasury, listOrgPayees } from "@/lib/org/auth-helpers";
import {
  buildAutoTransferPolicyRules,
  DEFAULT_AUTO_SPEND_CAP,
} from "@/lib/privy/provision-org-treasury";
import { updatePrivyPolicy } from "@/lib/web3/privy-client";

export async function syncPayeeAllowlist(organizationId: string): Promise<{
  synced: boolean;
  error?: string;
}> {
  const treasury = await getOrgTreasury(organizationId);
  if (!treasury?.autoPolicyId) {
    return { synced: false };
  }

  const payees = await listOrgPayees(organizationId);
  const allowlistedAddresses = payees.map((payee) => payee.address);

  try {
    await updatePrivyPolicy(treasury.autoPolicyId, {
      name: "auto payroll",
      rules: buildAutoTransferPolicyRules(
        treasury.autoSpendCapUsdc ?? DEFAULT_AUTO_SPEND_CAP,
        allowlistedAddresses
      ),
    });
    return { synced: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update treasury payee policy";
    console.error("[Org Treasury] Failed to sync payee allowlist:", error);
    return { synced: false, error: message };
  }
}
