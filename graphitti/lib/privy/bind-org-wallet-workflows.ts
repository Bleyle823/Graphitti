import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, workflows } from "@/lib/db/schema";
import { getOrgTreasury } from "@/lib/org/auth-helpers";
import {
  applyOrgWalletToNodes,
  workflowUsesOrgWallet,
} from "@/lib/workflow/bind-org-wallet-nodes";

export async function bindOrgWalletToMemberWorkflows(
  organizationId: string
): Promise<void> {
  const treasury = await getOrgTreasury(organizationId);
  if (!treasury) {
    return;
  }

  const memberships = await db
    .select({ userId: member.userId })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  const userIds = memberships.map((row) => row.userId);
  if (userIds.length === 0) {
    return;
  }

  const rows = await db
    .select({
      id: workflows.id,
      organizationId: workflows.organizationId,
      nodes: workflows.nodes,
    })
    .from(workflows)
    .where(
      and(inArray(workflows.userId, userIds), isNull(workflows.deletedAt))
    );

  for (const row of rows) {
    const nodes = Array.isArray(row.nodes) ? row.nodes : [];
    if (!workflowUsesOrgWallet(nodes)) {
      continue;
    }

    const applied = applyOrgWalletToNodes(nodes, {
      privyWalletId: treasury.privyWalletId,
      address: treasury.address,
    });
    const nextOrganizationId = row.organizationId ?? organizationId;
    if (!applied.changed && nextOrganizationId === row.organizationId) {
      continue;
    }

    await db
      .update(workflows)
      .set({
        nodes: applied.nodes,
        organizationId: nextOrganizationId,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, row.id));
  }
}
