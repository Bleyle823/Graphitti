import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization, organizationIntents } from "@/lib/db/schema";
import {
  getOrgTreasury,
  listOrgPayees,
  requireOrgMember,
  requireSessionUser,
} from "@/lib/org/auth-helpers";
import { getDailySpendUsedUsdc } from "@/lib/org/spend-ledger";

export async function GET() {
  const authResult = await requireSessionUser();
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });
  const activeOrganizationId = session?.session.activeOrganizationId;

  const memberships = await db
    .select({
      organizationId: member.organizationId,
      role: member.role,
      name: organization.name,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, authResult.user.id));

  if (!activeOrganizationId) {
    return NextResponse.json({
      organizations: memberships,
      activeOrganizationId: null,
      treasury: null,
      payees: [],
      intents: [],
    });
  }

  const access = await requireOrgMember(activeOrganizationId, "member");
  if (!access.success) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const treasury = await getOrgTreasury(activeOrganizationId);
  const payees = await listOrgPayees(activeOrganizationId);
  const intents = await db.query.organizationIntents.findMany({
    where: eq(organizationIntents.organizationId, activeOrganizationId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: 20,
  });

  return NextResponse.json({
    organizations: memberships,
    activeOrganizationId,
    role: access.membership.role,
    treasury,
    dailySpendUsedUsdc: await getDailySpendUsedUsdc(activeOrganizationId),
    payees,
    intents,
  });
}
