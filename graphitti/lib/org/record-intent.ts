import "server-only";

import { db } from "@/lib/db";
import { organizationIntents } from "@/lib/db/schema";

export async function recordOrganizationIntent(input: {
  organizationId: string;
  privyIntentId: string;
  amountUsdc?: string;
  toAddress?: string;
  workflowExecutionId?: string;
}) {
  await db.insert(organizationIntents).values({
    organizationId: input.organizationId,
    privyIntentId: input.privyIntentId,
    amountUsdc: input.amountUsdc ?? null,
    toAddress: input.toAddress?.toLowerCase() ?? null,
    workflowExecutionId: input.workflowExecutionId ?? null,
    status: "pending",
  });
}
