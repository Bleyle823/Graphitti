import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { db } from "@/lib/db";
import { workflowExecutionLogs, workflowExecutions } from "@/lib/db/schema";
import { executeWorkflow } from "@/lib/workflow-executor.workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

export async function startListedWorkflow(options: {
  workflowId: string;
  userId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  input: Record<string, unknown>;
}): Promise<string> {
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId: options.workflowId,
      userId: options.userId,
      status: "running",
      input: options.input,
    })
    .returning();

  start(executeWorkflow, [
    {
      nodes: options.nodes,
      edges: options.edges,
      triggerInput: options.input,
      executionId: execution.id,
      workflowId: options.workflowId,
    },
  ]);

  return execution.id;
}

export function mapOutputs(
  output: unknown,
  mapping: Record<string, unknown> | null | undefined
): unknown {
  if (!mapping || typeof mapping.field !== "string") {
    return output;
  }
  if (!output || typeof output !== "object") {
    return output;
  }
  const record = output as Record<string, unknown>;
  if (mapping.field in record) {
    return { [mapping.field]: record[mapping.field] };
  }
  if ("data" in record && record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (mapping.field in data) {
      return { [mapping.field]: data[mapping.field] };
    }
  }
  return output;
}

export async function waitForExecution(
  executionId: string,
  timeoutMs = 25_000
): Promise<{
  status: string;
  output: unknown;
  error: string | null;
}> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(workflowExecutions.id, executionId),
    });
    if (!execution) {
      return { status: "error", output: null, error: "Execution missing" };
    }
    if (execution.status !== "running" && execution.status !== "pending") {
      let output = execution.output;
      if (output == null) {
        const logs = await db
          .select()
          .from(workflowExecutionLogs)
          .where(eq(workflowExecutionLogs.executionId, executionId))
          .limit(20);
        output = logs.at(-1)?.output ?? null;
      }
      return {
        status: execution.status,
        output,
        error: execution.error,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return { status: "running", output: null, error: null };
}
