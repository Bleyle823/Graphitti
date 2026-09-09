import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { isAnonymousUserId } from "@/lib/is-anonymous";
import { cloneCatalogTemplatesForUser } from "@/lib/marketplace/clone-catalog";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json([], { status: 200 });
    }

    if (!(await isAnonymousUserId(session.user.id))) {
      try {
        await cloneCatalogTemplatesForUser(session.user.id);
      } catch (error) {
        console.error("Failed to clone catalog templates:", error);
      }
    }

    const userWorkflows = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.userId, session.user.id), isNull(workflows.deletedAt)))
      .orderBy(desc(workflows.updatedAt));

    const mappedWorkflows = userWorkflows.map((workflow) => ({
      ...workflow,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    }));

    return NextResponse.json(mappedWorkflows);
  } catch (error) {
    console.error("Failed to get workflows:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflows",
      },
      { status: 500 }
    );
  }
}
