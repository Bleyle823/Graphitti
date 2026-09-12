import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateWorkflowIntegrations } from "@/lib/db/integrations";
import {
  workflowExecutionLogs,
  workflowExecutions,
  workflowPayments,
  workflows,
} from "@/lib/db/schema";
import { isPubliclyReadable } from "@/lib/marketplace/listing";
import { resolveWorkflowAccess } from "@/lib/org/workflow-access";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
};

// Helper to strip sensitive data from nodes for public viewing
function sanitizeNodesForPublicView(
  nodes: Record<string, unknown>[]
): Record<string, unknown>[] {
  return nodes.map((node) => {
    const sanitizedNode = { ...node };
    if (
      sanitizedNode.data &&
      typeof sanitizedNode.data === "object" &&
      sanitizedNode.data !== null
    ) {
      const data = { ...(sanitizedNode.data as Record<string, unknown>) };
      // Remove integrationId from config to not expose which integrations are used
      if (
        data.config &&
        typeof data.config === "object" &&
        data.config !== null
      ) {
        const { integrationId: _, ...configWithoutIntegration } =
          data.config as Record<string, unknown>;
        data.config = configWithoutIntegration;
      }
      sanitizedNode.data = data;
    }
    return sanitizedNode;
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // First, try to find the workflow
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow || workflow.deletedAt) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const isOwner = session?.user?.id === workflow.userId;
    let canReadAsOrgMember = false;
    if (session?.user && !isOwner) {
      const access = await resolveWorkflowAccess(
        session.user.id,
        workflow,
        "read"
      );
      canReadAsOrgMember = access.allowed;
    }

    if (!(isOwner || canReadAsOrgMember || isPubliclyReadable(workflow))) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // For public or listed workflows viewed by non-owners, sanitize sensitive data
    const accessForEdit = session?.user
      ? await resolveWorkflowAccess(session.user.id, workflow, "update")
      : { allowed: false as const };

    const responseData = {
      ...workflow,
      nodes:
        isOwner || canReadAsOrgMember
          ? workflow.nodes
          : sanitizeNodesForPublicView(
              workflow.nodes as Record<string, unknown>[]
            ),
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      isOwner,
      canEdit: accessForEdit.allowed,
    };

    return NextResponse.json(responseData, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to get workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflow",
      },
      { status: 500 }
    );
  }
}

// Helper to build update data from request body
function buildUpdateData(
  body: Record<string, unknown>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) {
    updateData.name = body.name;
  }
  if (body.description !== undefined) {
    updateData.description = body.description;
  }
  if (body.nodes !== undefined) {
    updateData.nodes = body.nodes;
  }
  if (body.edges !== undefined) {
    updateData.edges = body.edges;
  }
  if (body.visibility !== undefined) {
    updateData.visibility = body.visibility;
  }

  return updateData;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingWorkflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!existingWorkflow || existingWorkflow.deletedAt) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const access = await resolveWorkflowAccess(
      session.user.id,
      existingWorkflow,
      "update"
    );
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason ?? "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate integrations for the editor (admin) or owner
    if (Array.isArray(body.nodes)) {
      const validation = await validateWorkflowIntegrations(
        body.nodes,
        session.user.id
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid integration references in workflow" },
          { status: 403 }
        );
      }
    }

    // Validate visibility value if provided
    if (
      body.visibility !== undefined &&
      body.visibility !== "private" &&
      body.visibility !== "public"
    ) {
      return NextResponse.json(
        { error: "Invalid visibility value. Must be 'private' or 'public'" },
        { status: 400 }
      );
    }

    const updateData = buildUpdateData(body);
    if (
      !existingWorkflow.organizationId &&
      session.session.activeOrganizationId
    ) {
      updateData.organizationId = session.session.activeOrganizationId;
    }

    const [updatedWorkflow] = await db
      .update(workflows)
      .set(updateData)
      .where(eq(workflows.id, workflowId))
      .returning();

    if (!updatedWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...updatedWorkflow,
      createdAt: updatedWorkflow.createdAt.toISOString(),
      updatedAt: updatedWorkflow.updatedAt.toISOString(),
      isOwner: existingWorkflow.userId === session.user.id,
      canEdit: true,
    });
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update workflow",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const existingWorkflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!existingWorkflow || existingWorkflow.deletedAt) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const access = await resolveWorkflowAccess(
      session.user.id,
      existingWorkflow,
      "delete"
    );
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason ?? "Forbidden" },
        { status: 403, headers: noStoreHeaders }
      );
    }

    const executions = await db.query.workflowExecutions.findMany({
      where: eq(workflowExecutions.workflowId, workflowId),
      columns: { id: true },
    });
    const executionIds = executions.map((execution) => execution.id);

    if (executionIds.length > 0) {
      await db
        .delete(workflowExecutionLogs)
        .where(inArray(workflowExecutionLogs.executionId, executionIds));
      await db
        .delete(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflowId));
    }

    await db
      .delete(workflowPayments)
      .where(eq(workflowPayments.workflowId, workflowId));

    await db
      .update(workflows)
      .set({
        deletedAt: new Date(),
        isListed: false,
        listedSlug: null,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflowId));

    return NextResponse.json({ success: true }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete workflow",
      },
      { status: 500 }
    );
  }
}
