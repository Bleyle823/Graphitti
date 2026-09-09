import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowExecutions } from "@/lib/db/schema";
import { getOrganizationIdFromExecution } from "@/lib/workflow/executor/helpers";

type WorkflowContext = {
  executionId?: string;
  organizationId?: string;
};

export async function resolveOrganizationContext(
  _context: WorkflowContext,
  _logTag: string,
  _actionName: string
): Promise<
  | { success: true; organizationId: string; userId: string | undefined }
  | { success: false; error: string }
> {
  let organizationId: string;

  if (_context.organizationId) {
    organizationId = _context.organizationId;
  } else if (_context.executionId) {
    try {
      organizationId = await getOrganizationIdFromExecution(
        _context.executionId
      );
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve organization from execution",
      };
    }
  } else {
    return {
      success: false,
      error: "Organization context is required for treasury workflows",
    };
  }

  if (_context.organizationId) {
    return { success: true, organizationId, userId: undefined };
  }

  const executionId = _context.executionId;
  if (!executionId) {
    return {
      success: false,
      error: "Execution ID is required for workflow execution context",
    };
  }

  const execution = await db
    .select({ userId: workflowExecutions.userId })
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, executionId))
    .then((rows) => rows[0]);

  if (!execution) {
    return { success: false, error: "Execution not found" };
  }

  return { success: true, organizationId, userId: execution.userId };
}
