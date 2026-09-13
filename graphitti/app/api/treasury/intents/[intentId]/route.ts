import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationIntents } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/org/auth-helpers";
import { resolveApproveIntentFields } from "@/lib/org/intent-guard";
import {
  releaseOrgSpendByRef,
  settleOrgSpendByRef,
} from "@/lib/org/spend-ledger";
import {
  getPrivyIntentAuthorizationSignInput,
  rejectPrivyIntent,
  signPrivyIntent,
} from "@/lib/web3/privy-client";

type IntentBody = {
  organizationId?: string;
  action?: "approve" | "reject";
  toAddress?: string | null;
  amountUsdc?: string | null;
  signature?: string;
  timestamp?: number;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await context.params;
  const organizationId = new URL(request.url).searchParams.get(
    "organizationId"
  );

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const access = await requireOrgMember(organizationId, "admin");
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
    const signInput = await getPrivyIntentAuthorizationSignInput(intentId);
    return NextResponse.json({ signInput });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare intent approval",
      },
      { status: 502 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await context.params;
  const body = (await request.json()) as IntentBody;
  const organizationId = body.organizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const access = await requireOrgMember(organizationId, "admin");
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

  if (intentRow.status !== "pending") {
    return NextResponse.json(
      { error: `Intent is already ${intentRow.status}` },
      { status: 409 }
    );
  }

  if (body.action === "reject") {
    try {
      await rejectPrivyIntent(intentId);
    } catch (error) {
      console.error("[Treasury] Privy intent reject failed:", error);
    }
    await db
      .update(organizationIntents)
      .set({
        status: "rejected",
        updatedAt: new Date(),
      })
      .where(eq(organizationIntents.id, intentRow.id));
    await releaseOrgSpendByRef(`intent:${intentId}`);
    return NextResponse.json({
      intent: {
        ...intentRow,
        status: "rejected",
      },
    });
  }

  const frozen = resolveApproveIntentFields(intentRow);

  const userAuthorization =
    body.signature && body.timestamp
      ? { signature: body.signature, timestamp: body.timestamp }
      : undefined;

  if (!userAuthorization) {
    return NextResponse.json(
      {
        error:
          "Privy authorization signature is required. Sign in with Privy and try Approve again.",
      },
      { status: 400 }
    );
  }

  try {
    const signed = await signPrivyIntent(intentId, userAuthorization);
    await db
      .update(organizationIntents)
      .set({
        status: (signed.status as typeof intentRow.status) ?? "processing",
        toAddress: frozen.toAddress,
        amountUsdc: frozen.amountUsdc,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntents.id, intentRow.id));
    await settleOrgSpendByRef(`intent:${intentId}`);

    return NextResponse.json({
      intent: signed,
      frozen,
    });
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
