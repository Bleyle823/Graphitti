import { and, count, eq, isNull, sql } from "drizzle-orm";
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

  const userId = session.user.id;

  const [workflowStats] = await db
    .select({
      total: count(),
      listed: sql<number>`sum(case when ${workflows.isListed} then 1 else 0 end)`,
    })
    .from(workflows)
    .where(and(eq(workflows.userId, userId), isNull(workflows.deletedAt)));

  const [runStats] = await db
    .select({
      total: count(),
      success: sql<number>`sum(case when ${workflowExecutions.status} = 'success' then 1 else 0 end)`,
      error: sql<number>`sum(case when ${workflowExecutions.status} = 'error' then 1 else 0 end)`,
    })
    .from(workflowExecutions)
    .where(eq(workflowExecutions.userId, userId));

  return NextResponse.json({
    workflows: Number(workflowStats?.total ?? 0),
    listed: Number(workflowStats?.listed ?? 0),
    executions: Number(runStats?.total ?? 0),
    successes: Number(runStats?.success ?? 0),
    errors: Number(runStats?.error ?? 0),
  });
}
