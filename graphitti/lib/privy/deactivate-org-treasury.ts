import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationWallets } from "@/lib/db/schema";
import { unbindOrgWalletFromMemberWorkflows } from "@/lib/privy/bind-org-wallet-workflows";
import { archivePrivyWallet } from "@/lib/web3/privy-client";

export async function deactivateOrgTreasury(
  organizationId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const treasury = await db.query.organizationWallets.findFirst({
    where: and(
      eq(organizationWallets.organizationId, organizationId),
      eq(organizationWallets.isActive, true)
    ),
  });

  if (!treasury) {
    return {
      success: false,
      error: "No active treasury wallet for organization",
    };
  }

  try {
    await archivePrivyWallet(treasury.privyWalletId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to archive Privy wallet";
    console.error("[Org Treasury] Privy archive failed:", error);
    return { success: false, error: message };
  }

  await db
    .update(organizationWallets)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(organizationWallets.id, treasury.id));

  try {
    await unbindOrgWalletFromMemberWorkflows(organizationId, treasury);
  } catch (error) {
    console.error(
      "[Org Treasury] Failed to unbind org wallet from workflows:",
      error
    );
  }

  return { success: true };
}
