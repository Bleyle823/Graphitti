import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { requireOrgMember } from "@/lib/org/auth-helpers";
import { ensureOrgTreasury } from "@/lib/privy/ensure-org-treasury";

type ProvisionBody = {
  organizationId?: string;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const body = (await request.json().catch(() => ({}))) as ProvisionBody;
  const organizationId =
    body.organizationId ?? session?.session.activeOrganizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: "No active organization" },
      { status: 400 }
    );
  }

  const access = await requireOrgMember(organizationId, "member");
  if (!access.success) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });
  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const result = await ensureOrgTreasury({
    organizationId,
    organizationName: org.name,
    creatorUserId: access.userId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ treasury: result.treasury });
}
