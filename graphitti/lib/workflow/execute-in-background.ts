import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { executeWorkflow } from "@/lib/workflow-executor.workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { isInProcessExecutionMode } from "./execution-mode";
import { spawnInProcessRunner } from "./spawn-in-process-runner";

type BackgroundLogContext = {
  logPrefix: string;
};

/**
 * Fire-and-forget workflow kick-off shared by execute, webhook, and marketplace
 * paths. Terminal status is written from inside `executeWorkflow` via
 * `_workflowComplete`; this helper only records failures during startup.
 */
export async function executeWorkflowInBackground(
  executionId: string,
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  input: Record<string, unknown>,
  context: BackgroundLogContext = { logPrefix: "[Workflow Execute]" }
): Promise<void> {
  const { logPrefix } = context;

  try {
    console.log(`${logPrefix} Starting execution:`, executionId);

    const workflowRow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
      columns: { organizationId: true },
    });

    if (isInProcessExecutionMode()) {
      // Standalone tsx process: executor imported outside Next's workflow
      // compiler so `"use step"` stays a no-op string (KeeperHub pattern).
      await spawnInProcessRunner({
        workflowId,
        executionId,
        input,
        organizationId: workflowRow?.organizationId ?? undefined,
        logPrefix,
      });
      console.log(`${logPrefix} Dispatched in-process runner:`, executionId);
      return;
    }

    console.log(`${logPrefix} Calling durable executeWorkflow via start():`, {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasExecutionId: !!executionId,
      workflowId,
    });

    await start(executeWorkflow, [
      {
        nodes,
        edges,
        triggerInput: input,
        executionId,
        workflowId,
        organizationId: workflowRow?.organizationId ?? undefined,
      },
    ]);

    console.log(`${logPrefix} Durable workflow started successfully`);
  } catch (error) {
    console.error(`${logPrefix} Error during execution:`, error);
    console.error(
      `${logPrefix} Error stack:`,
      error instanceof Error ? error.stack : "N/A"
    );

    await db
      .update(workflowExecutions)
      .set({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));
  }
}
