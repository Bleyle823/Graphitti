import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationIntents } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/org/auth-helpers";
import { signPrivyIntent } from "@/lib/web3/privy-client";

type ApproveBody = {
  organizationId?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await context.params;
  const body = (await request.json()) as ApproveBody;
  const organizationId = body.organizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const access = await requireOrgMember(organizationId, "owner");
  if (!access.success) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const intentRow = await db.query.organizationIntents.findFirst({
    where: eq(organizationIntents.privyIntentId, intentId),
  });
  if (!intentRow || intentRow.organizationId !== organizationId) {
    return NextResponse.json({ error: "Intent not found" }, { status: 404 });
  }

  try {
    const signed = await signPrivyIntent(intentId);
    await db
      .update(organizationIntents)
      .set({
        status: (signed.status as typeof intentRow.status) ?? "processing",
        updatedAt: new Date(),
      })
      .where(eq(organizationIntents.id, intentRow.id));

    return NextResponse.json({ intent: signed });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to approve intent",
      },
      { status: 502 }
    );
  }
}
