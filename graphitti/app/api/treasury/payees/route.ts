import { and, eq } from "drizzle-orm";
import { ethers } from "ethers";
import { NextResponse } from "next/server";
import { normalizeAddressForStorage } from "@/lib/address-utils";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationPayees } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/org/auth-helpers";
import { syncPayeeAllowlist } from "@/lib/privy/sync-payee-allowlist";

type PayeeBody = {
  organizationId?: string;
  label?: string;
  address?: string;
  defaultAmountUsdc?: string;
  chain?: string;
};

function isUniqueConstraintError(error: unknown): boolean {
  let current: unknown = error;
  for (let index = 0; index < 4 && current; index += 1) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code: unknown }).code === "23505"
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : undefined;
  }
  return false;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const body = (await request.json()) as PayeeBody;
  const organizationId =
    body.organizationId ?? session?.session.activeOrganizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: "No active organization" },
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

  if (!(body.label && body.address)) {
    return NextResponse.json(
      { error: "label and address are required" },
      { status: 400 }
    );
  }

  if (!ethers.isAddress(body.address)) {
    return NextResponse.json(
      { error: "Enter a valid EVM payee address" },
      { status: 400 }
    );
  }

  try {
    const [payee] = await db
      .insert(organizationPayees)
      .values({
        organizationId,
        label: body.label.trim(),
        address: normalizeAddressForStorage(body.address),
        defaultAmountUsdc: body.defaultAmountUsdc ?? null,
        chain: body.chain ?? "base_sepolia",
      })
      .returning();

    const policy = await syncPayeeAllowlist(organizationId);
    return NextResponse.json({
      payee,
      policySynced: policy.synced,
      policyWarning: policy.error,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "That payee address is already in the book" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add payee",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const payeeId = searchParams.get("id");
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const organizationId =
    searchParams.get("organizationId") ??
    session?.session.activeOrganizationId ??
    null;

  if (!(payeeId && organizationId)) {
    return NextResponse.json(
      { error: "id and organizationId required" },
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

  const existing = await db.query.organizationPayees.findFirst({
    where: and(
      eq(organizationPayees.id, payeeId),
      eq(organizationPayees.organizationId, organizationId)
    ),
  });
  if (!existing) {
    return NextResponse.json({ error: "Payee not found" }, { status: 404 });
  }

  await db.delete(organizationPayees).where(eq(organizationPayees.id, payeeId));
  const policy = await syncPayeeAllowlist(organizationId);

  return NextResponse.json({
    success: true,
    policySynced: policy.synced,
    policyWarning: policy.error,
  });
}
