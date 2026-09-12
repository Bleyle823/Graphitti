import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";
import { isPubliclyReadable } from "@/lib/marketplace/listing";
import { resolveWorkflowAccess } from "@/lib/org/workflow-access";

export async function GET(
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

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const isOwner = session.user.id === workflow.userId;
    let canViewExecutions = isOwner;
    if (!isOwner) {
      const access = await resolveWorkflowAccess(
        session.user.id,
        workflow,
        "read"
      );
      canViewExecutions = access.allowed;
    }

    if (!(canViewExecutions || isPubliclyReadable(workflow))) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    if (!canViewExecutions) {
      return NextResponse.json([]);
    }

    // Fetch executions
    const executions = await db.query.workflowExecutions.findMany({
      where: eq(workflowExecutions.workflowId, workflowId),
      orderBy: [desc(workflowExecutions.startedAt)],
      limit: 50,
    });

    return NextResponse.json(executions);
  } catch (error) {
    console.error("Failed to get executions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get executions",
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const access = await resolveWorkflowAccess(
      session.user.id,
      workflow,
      "delete"
    );
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason ?? "Forbidden" },
        { status: 403 }
      );
    }

    // Get all execution IDs for this workflow
    const executions = await db.query.workflowExecutions.findMany({
      where: eq(workflowExecutions.workflowId, workflowId),
      columns: { id: true },
    });

    const executionIds = executions.map((e) => e.id);

    // Delete logs first (if there are any executions)
    if (executionIds.length > 0) {
      const { workflowExecutionLogs } = await import("@/lib/db/schema");
      const { inArray } = await import("drizzle-orm");

      await db
        .delete(workflowExecutionLogs)
        .where(inArray(workflowExecutionLogs.executionId, executionIds));

      // Then delete the executions
      await db
        .delete(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflowId));
    }

    return NextResponse.json({
      success: true,
      deletedCount: executionIds.length,
    });
  } catch (error) {
    console.error("Failed to delete executions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete executions",
      },
      { status: 500 }
    );
  }
}
