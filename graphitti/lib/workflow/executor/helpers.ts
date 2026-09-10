import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  member,
  organizationWallets,
  workflowExecutions,
  workflows,
} from "@/lib/db/schema";

export async function resolveOrganizationIdForUser(
  userId: string
): Promise<string | null> {
  const [row] = await db
    .select({ organizationId: organizationWallets.organizationId })
    .from(member)
    .innerJoin(
      organizationWallets,
      and(
        eq(organizationWallets.organizationId, member.organizationId),
        eq(organizationWallets.isActive, true)
      )
    )
    .where(eq(member.userId, userId))
    .limit(1);

  return row?.organizationId ?? null;
}

export async function getOrganizationIdFromExecution(
  executionId: string
): Promise<string> {
  const row = await db
    .select({
      organizationId: workflows.organizationId,
      workflowUserId: workflows.userId,
      executionUserId: workflowExecutions.userId,
    })
    .from(workflowExecutions)
    .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
    .where(eq(workflowExecutions.id, executionId))
    .limit(1)
    .then((rows) => rows[0]);

  if (row?.organizationId) {
    return row.organizationId;
  }

  const userId = row?.executionUserId ?? row?.workflowUserId;
  const fallback = userId ? await resolveOrganizationIdForUser(userId) : null;
  if (fallback) {
    return fallback;
  }

  throw new Error(
    "No organization treasury found. Create an org wallet in Treasury first."
  );
}
