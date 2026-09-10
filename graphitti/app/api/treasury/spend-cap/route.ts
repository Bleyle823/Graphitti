import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationWallets } from "@/lib/db/schema";
import { getOrgTreasury, requireOrgMember } from "@/lib/org/auth-helpers";
import { getDailySpendUsedUsdc } from "@/lib/org/spend-ledger";
import { syncPayeeAllowlist } from "@/lib/privy/sync-payee-allowlist";

type SpendCapBody = {
  organizationId?: string;
  autoSpendCapUsdc?: string;
  dailySpendCapUsdc?: string | null;
};

function parseCap(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return trimmed;
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as SpendCapBody;
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

  const treasury = await getOrgTreasury(organizationId);
  if (!treasury) {
    return NextResponse.json(
      { error: "Treasury wallet is not provisioned yet" },
      { status: 409 }
    );
  }

  const autoSpendCapUsdc =
    parseCap(body.autoSpendCapUsdc) ?? treasury.autoSpendCapUsdc;
  const dailySpendCapUsdc =
    body.dailySpendCapUsdc === undefined
      ? treasury.dailySpendCapUsdc
      : parseCap(body.dailySpendCapUsdc);

  if (
    body.autoSpendCapUsdc !== undefined &&
    parseCap(body.autoSpendCapUsdc) == null
  ) {
    return NextResponse.json(
      { error: "autoSpendCapUsdc must be a non-negative number" },
      { status: 400 }
    );
  }

  await db
    .update(organizationWallets)
    .set({
      autoSpendCapUsdc,
      dailySpendCapUsdc,
      updatedAt: new Date(),
    })
    .where(eq(organizationWallets.id, treasury.id));

  const policy = await syncPayeeAllowlist(organizationId);
  const dailySpendUsedUsdc = await getDailySpendUsedUsdc(organizationId);

  return NextResponse.json({
    treasury: {
      ...treasury,
      autoSpendCapUsdc,
      dailySpendCapUsdc,
    },
    dailySpendUsedUsdc,
    policyWarning: policy.error,
  });
}
