import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import { workflows } from "@/lib/db/schema";
import { startListedWorkflow } from "@/lib/marketplace/run-workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({ headers: request.headers });
    const authHeader = request.headers.get("Authorization");

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    let userId = session?.user?.id;
    if (!userId) {
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
      return NextResponse.json(
        { error: "Workflow contains invalid integration references" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = (body.input as Record<string, unknown>) || body || {};

    const executionId = await startListedWorkflow({
      workflowId,
      userId,
      nodes: workflow.nodes as WorkflowNode[],
      edges: workflow.edges as WorkflowEdge[],
      input,
    });

    return NextResponse.json({ executionId, status: "running" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute workflow",
      },
      { status: 500 }
    );
  }
}
