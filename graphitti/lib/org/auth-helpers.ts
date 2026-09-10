import "server-only";

import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  member,
  organizationPayees,
  organizationWallets,
} from "@/lib/db/schema";
import { hasMinimumOrgRole } from "@/lib/org/member-role";

export async function requireSessionUser() {
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((m) => m.headers()),
  });
  if (!session?.user) {
    return { success: false as const, error: "Unauthorized", status: 401 };
  }
  return {
    success: true as const,
    user: session.user,
    session: session.session,
  };
}

export async function requireOrgMember(
  organizationId: string,
  minimumRole: "member" | "admin" | "owner" = "member"
) {
  const authResult = await requireSessionUser();
  if (!authResult.success) {
    return authResult;
  }

  return requireOrgMemberForUser(
    authResult.user.id,
    organizationId,
    minimumRole
  );
}

export async function requireOrgMemberForUser(
  userId: string,
  organizationId: string,
  minimumRole: "member" | "admin" | "owner" = "member"
) {
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, userId)
    ),
  });

  if (!membership) {
    return { success: false as const, error: "Not a member", status: 403 };
  }

  const roleOk = hasMinimumOrgRole(membership.role, minimumRole);

  if (!roleOk) {
    return { success: false as const, error: "Insufficient role", status: 403 };
  }

  return {
    success: true as const,
    userId,
    membership,
  };
}

export async function getOrgTreasury(organizationId: string) {
  return await db.query.organizationWallets.findFirst({
    where: and(
      eq(organizationWallets.organizationId, organizationId),
      eq(organizationWallets.isActive, true)
    ),
  });
}

export async function listOrgPayees(organizationId: string) {
  return await db.query.organizationPayees.findMany({
    where: eq(organizationPayees.organizationId, organizationId),
  });
}
