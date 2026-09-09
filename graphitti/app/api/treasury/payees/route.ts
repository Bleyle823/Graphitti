import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationPayees } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/org/auth-helpers";

type PayeeBody = {
  organizationId?: string;
  label?: string;
  address?: string;
  defaultAmountUsdc?: string;
  chain?: string;
};

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

  const [payee] = await db
    .insert(organizationPayees)
    .values({
      organizationId,
      label: body.label,
      address: body.address.toLowerCase(),
      defaultAmountUsdc: body.defaultAmountUsdc ?? null,
      chain: body.chain ?? "base_sepolia",
    })
    .returning();

  return NextResponse.json({ payee });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const payeeId = searchParams.get("id");
  const organizationId = searchParams.get("organizationId");

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

  await db.delete(organizationPayees).where(eq(organizationPayees.id, payeeId));

  return NextResponse.json({ success: true });
}
