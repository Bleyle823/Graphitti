import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, workflows } from "@/lib/db/schema";
import { getOrgTreasury } from "@/lib/org/auth-helpers";
import {
  applyOrgWalletToNodes,
  clearOrgWalletFromNodes,
  workflowUsesOrgWallet,
} from "@/lib/workflow/bind-org-wallet-nodes";

export type OrgTreasuryRecord = {
  privyWalletId: string;
  address: string;
};

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

export async function unbindOrgWalletFromMemberWorkflows(
  organizationId: string,
  treasury: OrgTreasuryRecord
): Promise<void> {
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

    const applied = clearOrgWalletFromNodes(nodes, treasury);
    if (!applied.changed) {
      continue;
    }

    await db
      .update(workflows)
      .set({
        nodes: applied.nodes,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, row.id));
  }
}
