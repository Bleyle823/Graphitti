import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, member } from "@/lib/db/schema";
import { hasMinimumOrgRole } from "@/lib/org/member-role";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ keyId: string }> }
) {
  try {
    const { keyId } = await context.params;
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, keyId),
    });
    if (!existing) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const ownsKey = existing.userId === session.user.id;
    let canDeleteOrgKey = false;
    if (existing.organizationId) {
      const membership = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, existing.organizationId),
          eq(member.userId, session.user.id)
        ),
      });
      canDeleteOrgKey = hasMinimumOrgRole(membership?.role, "admin");
    }

    if (!(ownsKey || canDeleteOrgKey)) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
