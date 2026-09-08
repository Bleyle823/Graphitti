import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { executeWorkflowInBackground } from "@/lib/workflow/execute-in-background";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

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

    const body = await request.json().catch(() => ({}));
    const input = body.input || {};

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

    void executeWorkflowInBackground(
      execution.id,
      workflowId,
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      input,
      { logPrefix: "[Workflow Execute]" }
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
