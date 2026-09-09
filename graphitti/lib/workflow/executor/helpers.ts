import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";

export async function getOrganizationIdFromExecution(
  executionId: string
): Promise<string> {
  const row = await db
    .select({
      organizationId: workflows.organizationId,
    })
    .from(workflowExecutions)
    .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
    .where(eq(workflowExecutions.id, executionId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!row?.organizationId) {
    throw new Error("Workflow is not owned by an organization");
  }

  return row.organizationId;
}
