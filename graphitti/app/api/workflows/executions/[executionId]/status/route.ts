import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutionLogs, workflowExecutions } from "@/lib/db/schema";
import { resolveWorkflowAccess } from "@/lib/org/workflow-access";

type NodeStatus = {
  nodeId: string;
  status: "pending" | "running" | "success" | "error";
};

/**
 * A run that has logged nothing for this long was never picked up by the
 * workflow runtime (`start()` can resolve without the run being dispatched, so
 * there is no error to record). Generous, because the first dispatch in dev has
 * to compile the step route before any step reports in.
 */
const ORPHANED_RUN_MS = 15 * 60 * 1000;

const ORPHANED_RUN_ERROR =
  "The workflow runtime never picked up this run. Restart the dev server and try again.";

export async function GET(
  request: Request,
  context: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the execution and verify ownership
    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(workflowExecutions.id, executionId),
      with: {
        workflow: true,
      },
    });

    if (!execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    const access = await resolveWorkflowAccess(
      session.user.id,
      execution.workflow,
      "read"
    );
    if (!access.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get logs for all nodes
    const logs = await db.query.workflowExecutionLogs.findMany({
      where: eq(workflowExecutionLogs.executionId, executionId),
    });

    // Map logs to node statuses
    const nodeStatuses: NodeStatus[] = logs.map((log) => ({
      nodeId: log.nodeId,
      status: log.status,
    }));

    // Reconcile runs the workflow runtime silently dropped, so callers get a
    // terminal status instead of polling "running" forever.
    const startedAt = execution.startedAt?.getTime() ?? Date.now();
    if (
      execution.status === "running" &&
      logs.length === 0 &&
      Date.now() - startedAt >= ORPHANED_RUN_MS
    ) {
      await db
        .update(workflowExecutions)
        .set({
          status: "error",
          error: ORPHANED_RUN_ERROR,
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));

      return NextResponse.json({
        status: "error",
        error: ORPHANED_RUN_ERROR,
        nodeStatuses,
      });
    }

    return NextResponse.json({
      status: execution.status,
      nodeStatuses,
    });
  } catch (error) {
    console.error("Failed to get execution status:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get execution status",
      },
      { status: 500 }
    );
  }
}
