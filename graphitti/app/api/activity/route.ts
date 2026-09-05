import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowExecutions, workflows } from "@/lib/db/schema";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select({
      id: workflowExecutions.id,
      workflowId: workflowExecutions.workflowId,
      workflowName: workflows.name,
      status: workflowExecutions.status,
      error: workflowExecutions.error,
      startedAt: workflowExecutions.startedAt,
      completedAt: workflowExecutions.completedAt,
      duration: workflowExecutions.duration,
    })
    .from(workflowExecutions)
    .innerJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
    .where(eq(workflowExecutions.userId, session.user.id))
    .orderBy(desc(workflowExecutions.startedAt))
    .limit(50);

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      startedAt: item.startedAt.toISOString(),
      completedAt: item.completedAt?.toISOString() ?? null,
    })),
  });
}
