/**
 * Standalone in-process workflow runner.
 *
 * Invoked by API routes when GRAPHITTI_EXECUTION_MODE=in-process (default).
 * Imports the executor outside Next's withWorkflow() compiler so `"use step"`
 * does not become DevKit HTTP hops between nodes.
 *
 * Env (required): WORKFLOW_ID, EXECUTION_ID
 * Env (optional): WORKFLOW_INPUT — JSON trigger payload (default {})
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { patchServerOnly } from "./lib/patch-server-only";

function loadEnvFile(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }
  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[InProcessRunner] ${name} is required`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  patchServerOnly(projectRoot);
  loadEnvFile();

  const workflowId = requireEnv("WORKFLOW_ID");
  const executionId = requireEnv("EXECUTION_ID");

  let triggerInput: Record<string, unknown> = {};
  if (process.env.WORKFLOW_INPUT) {
    try {
      triggerInput = JSON.parse(process.env.WORKFLOW_INPUT) as Record<
        string,
        unknown
      >;
    } catch (error) {
      console.error("[InProcessRunner] Failed to parse WORKFLOW_INPUT:", error);
      process.exit(1);
    }
  }

  const startTime = Date.now();
  console.log("[InProcessRunner] Starting workflow execution");
  console.log(`[InProcessRunner] Workflow ID: ${workflowId}`);
  console.log(`[InProcessRunner] Execution ID: ${executionId}`);

  let closeDbConnections: (() => Promise<void>) | undefined;
  let exitCode = 0;

  try {
    const { eq } = await import("drizzle-orm");
    const dbModule = await import("@/lib/db");
    closeDbConnections = dbModule.closeDbConnections;
    const { db } = dbModule;
    const { workflowExecutions, workflows } = await import("@/lib/db/schema");
    const { executeWorkflow } = await import("@/lib/workflow-executor.workflow");
    type WorkflowNode = import("@/lib/workflow-store").WorkflowNode;
    type WorkflowEdge = import("@/lib/workflow-store").WorkflowEdge;

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const nodes = workflow.nodes as WorkflowNode[];
    const edges = workflow.edges as WorkflowEdge[];

    const result = await executeWorkflow({
      nodes,
      edges,
      triggerInput,
      executionId,
      workflowId,
    });

    const duration = Date.now() - startTime;
    console.log(
      `[InProcessRunner] Completed in ${duration}ms (success=${result.success})`
    );

    if (!result.success) {
      const errorMessage =
        result.error ??
        Object.values(result.results).find((entry) => !entry.success)?.error ??
        "Workflow execution failed";

      await db
        .update(workflowExecutions)
        .set({
          status: "error",
          error: errorMessage,
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));
    }
  } catch (error) {
    exitCode = 1;
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[InProcessRunner] Fatal error after ${duration}ms:`,
      errorMessage
    );

    try {
      const { eq } = await import("drizzle-orm");
      const dbModule = await import("@/lib/db");
      closeDbConnections ??= dbModule.closeDbConnections;
      const { workflowExecutions } = await import("@/lib/db/schema");
      await dbModule.db
        .update(workflowExecutions)
        .set({
          status: "error",
          error: errorMessage,
          completedAt: new Date(),
        })
        .where(eq(workflowExecutions.id, executionId));
    } catch (updateError) {
      console.error(
        "[InProcessRunner] Failed to update execution status:",
        updateError
      );
    }
  } finally {
    await closeDbConnections?.();
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

main().catch((error) => {
  console.error("[InProcessRunner] Unhandled error:", error);
  process.exit(1);
});
