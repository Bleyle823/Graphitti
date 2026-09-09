import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

export async function GET(request: Request) {
  const noStore = {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  };

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json([], { status: 200, headers: noStore });
    }

    const userWorkflows = await db
      .select()
      .from(workflows)
      .where(
        and(eq(workflows.userId, session.user.id), isNull(workflows.deletedAt))
      )
      .orderBy(desc(workflows.updatedAt));

    const mappedWorkflows = userWorkflows.map((workflow) => ({
      ...workflow,
      createdAt: toIso(workflow.createdAt) ?? new Date().toISOString(),
      updatedAt: toIso(workflow.updatedAt) ?? new Date().toISOString(),
      listedAt: toIso(workflow.listedAt),
      deletedAt: toIso(workflow.deletedAt),
    }));

    return NextResponse.json(mappedWorkflows, { headers: noStore });
  } catch (error) {
    console.error("Failed to get workflows:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflows",
      },
      { status: 500, headers: noStore }
    );
  }
}
