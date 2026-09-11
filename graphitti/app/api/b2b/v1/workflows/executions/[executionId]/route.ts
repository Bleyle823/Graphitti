import { eq } from "drizzle-orm";
import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { workflowExecutionLogs, workflowExecutions } from "@/lib/db/schema";

export function OPTIONS() {
  return b2bOptions();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ executionId: string }> }
) {
  const authResult = await requireB2bAuth(
    request.headers.get("Authorization"),
    ["workflows:read"]
  );
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const { executionId } = await context.params;
  const execution = await db.query.workflowExecutions.findFirst({
    where: eq(workflowExecutions.id, executionId),
    with: { workflow: true },
  });

  if (!execution || execution.userId !== authResult.auth.userId) {
    return b2bError("Execution not found", 404);
  }

  const logs = await db.query.workflowExecutionLogs.findMany({
    where: eq(workflowExecutionLogs.executionId, executionId),
  });

  return b2bJson({
    execution_id: executionId,
    status: execution.status,
    error: execution.error,
    output: execution.output,
    node_statuses: logs.map((log) => ({
      node_id: log.nodeId,
      status: log.status,
    })),
  });
}
