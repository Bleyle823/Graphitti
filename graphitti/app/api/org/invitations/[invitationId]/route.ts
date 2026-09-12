import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitation, organization } from "@/lib/db/schema";

/**
 * Invitation preview for the accept page. The invitation id is the shared
 * secret, so no session is required — the invitee has not signed in yet and
 * needs to know which organization and email the link is for.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await context.params;

    const row = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organizationName: organization.name,
      })
      .from(invitation)
      .innerJoin(organization, eq(organization.id, invitation.organizationId))
      .where(eq(invitation.id, invitationId))
      .limit(1);

    const found = row.at(0);
    if (!found) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: found.email,
      role: found.role ?? "member",
      status: found.status,
      organizationName: found.organizationName,
      expired: found.expiresAt.getTime() < Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load invitation",
      },
      { status: 500 }
    );
  }
}
