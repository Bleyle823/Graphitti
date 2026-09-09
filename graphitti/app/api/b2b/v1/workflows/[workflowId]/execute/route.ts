import { eq } from "drizzle-orm";
import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { executeWorkflowInBackground } from "@/lib/workflow/execute-in-background";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

export function OPTIONS() {
  return b2bOptions();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const authResult = await requireB2bAuth(request.headers.get("Authorization"), [
    "workflows:execute",
  ]);
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const { workflowId } = await context.params;
  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, workflowId),
  });

  if (!workflow || workflow.userId !== authResult.auth.userId) {
    return b2bError("Workflow not found", 404);
  }

  const validation = await validateWorkflowIntegrations(
    workflow.nodes as WorkflowNode[],
    authResult.auth.userId
  );
  if (!validation.valid) {
    return b2bError("Workflow contains invalid integration references", 403);
  }

  const body = (await request.json().catch(() => ({}))) as { input?: Record<string, unknown> };
  const input = body.input ?? {};

  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId,
      userId: authResult.auth.userId,
      status: "running",
      input,
    })
    .returning();

  void executeWorkflowInBackground(
    execution.id,
    workflowId,
    workflow.nodes as WorkflowNode[],
    workflow.edges as WorkflowEdge[],
    input,
    { logPrefix: "[B2B Workflow Execute]" }
  );

  return b2bJson({ execution_id: execution.id, status: execution.status });
}
