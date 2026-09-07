import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { executeWorkflow } from "@/lib/workflow-executor.workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

// biome-ignore lint/nursery/useMaxParams: Background execution requires all workflow context
async function executeWorkflowBackground(
  executionId: string,
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  input: Record<string, unknown>
) {
  try {
    console.log("[Workflow Execute] Starting execution:", executionId);

    // SECURITY: We pass only the workflowId as a reference
    // Steps will fetch credentials internally using fetchWorkflowCredentials(workflowId)
    // This prevents credentials from being logged in Vercel's observability
    console.log("[Workflow Execute] Calling executeWorkflow with:", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasExecutionId: !!executionId,
      workflowId,
    });

    // Await start() so startup failures are caught and mark the execution error
    // instead of leaving the first node stuck on "running".
    await start(executeWorkflow, [
      {
        nodes,
        edges,
        triggerInput: input,
        executionId,
        workflowId, // Pass workflow ID so steps can fetch credentials
      },
    ]);

    console.log("[Workflow Execute] Workflow started successfully");
  } catch (error) {
    console.error("[Workflow Execute] Error during execution:", error);
    console.error(
      "[Workflow Execute] Error stack:",
      error instanceof Error ? error.stack : "N/A"
    );

    // Update execution record with error
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

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;

    const session = await auth.api.getSession({
      headers: request.headers,
    });
    const authHeader = request.headers.get("Authorization");

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    let userId = session?.user?.id;
    if (!userId) {
      const { validateApiKey } = await import("@/lib/auth/api-key");
      const key = await validateApiKey(authHeader, workflow.userId);
      if (!key.valid) {
        return NextResponse.json(
          { error: key.error },
          { status: key.statusCode }
        );
      }
      userId = key.userId;
    }

    if (workflow.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const validation = await validateWorkflowIntegrations(
      workflow.nodes as WorkflowNode[],
      userId
    );
    if (!validation.valid) {
      console.error(
        "[Workflow Execute] Invalid integration references:",
        validation.invalidIds
      );
      return NextResponse.json(
        { error: "Workflow contains invalid integration references" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const input = body.input || {};

    // Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        userId,
        status: "running",
        input,
      })
      .returning();

    console.log("[API] Created execution:", execution.id);

    // Fire-and-forget; executeWorkflowBackground catches start() failures and
    // marks the execution as error so the UI does not spin forever.
    void executeWorkflowBackground(
      execution.id,
      workflowId,
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      input
    ).catch(async (error) => {
      console.error("[API] Background execution rejected:", error);
      try {
        await db
          .update(workflowExecutions)
          .set({
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Failed to start workflow execution",
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, execution.id));
      } catch (dbError) {
        console.error("[API] Failed to mark execution error:", dbError);
      }
    });

    // Return immediately with the execution ID
    return NextResponse.json({
      executionId: execution.id,
      status: "running",
    });
  } catch (error) {
    console.error("Failed to start workflow execution:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute workflow",
      },
      { status: 500 }
    );
  }
}
