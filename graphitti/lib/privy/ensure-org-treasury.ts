import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationWallets } from "@/lib/db/schema";
import { bindOrgWalletToMemberWorkflows } from "@/lib/privy/bind-org-wallet-workflows";
import { provisionOrgTreasury } from "@/lib/privy/provision-org-treasury";

export type EnsureOrgTreasuryInput = {
  organizationId: string;
  organizationName: string;
  creatorUserId: string;
};

export async function ensureOrgTreasury(input: EnsureOrgTreasuryInput) {
  const existing = await db.query.organizationWallets.findFirst({
    where: and(
      eq(organizationWallets.organizationId, input.organizationId),
      eq(organizationWallets.isActive, true)
    ),
  });
  if (existing) {
    try {
      await bindOrgWalletToMemberWorkflows(input.organizationId);
    } catch (error) {
      console.error(
        "[Org Treasury] Failed to bind org wallet to workflows:",
        error
      );
    }
    return { success: true as const, treasury: existing };
  }

  try {
    const provisioned = await provisionOrgTreasury({
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      creatorUserId: input.creatorUserId,
    });

    const [treasury] = await db
      .insert(organizationWallets)
      .values({
        organizationId: input.organizationId,
        userId: input.creatorUserId,
        privyWalletId: provisioned.privyWalletId,
        address: provisioned.address,
        privyOrganizationId: provisioned.privyOrganizationId,
        ownerQuorumId: provisioned.ownerQuorumId,
        operatorSignerId: provisioned.operatorSignerId,
        autoPolicyId: provisioned.autoPolicyId,
        humanPolicyId: provisioned.humanPolicyId,
      })
      .returning();

    if (!treasury) {
      return {
        success: false as const,
        error: "Treasury wallet was created in Privy but not saved",
      };
    }

    try {
      await bindOrgWalletToMemberWorkflows(input.organizationId);
    } catch (error) {
      console.error(
        "[Org Treasury] Failed to bind org wallet to workflows:",
        error
      );
    }

    return { success: true as const, treasury };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to provision treasury wallet";
    console.error("[Org Treasury] Failed to provision Privy wallet:", error);
    return { success: false as const, error: message };
  }
}
