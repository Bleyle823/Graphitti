import { eq } from "drizzle-orm";
import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { member, organization, users } from "@/lib/db/schema";

export function OPTIONS() {
  return b2bOptions();
}

export async function GET(request: Request) {
  const authResult = await requireB2bAuth(request.headers.get("Authorization"));
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, authResult.auth.userId),
  });

  let organizationRecord = null;
  if (authResult.auth.organizationId) {
    organizationRecord = await db.query.organization.findFirst({
      where: eq(organization.id, authResult.auth.organizationId),
    });
  }

  const memberships = await db
    .select({
      organizationId: member.organizationId,
      role: member.role,
      name: organization.name,
      slug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, authResult.auth.userId));

  return b2bJson({
    user: user
      ? { id: user.id, email: user.email, name: user.name }
      : { id: authResult.auth.userId },
    organizationId: authResult.auth.organizationId ?? null,
    organization: organizationRecord
      ? {
          id: organizationRecord.id,
          name: organizationRecord.name,
          slug: organizationRecord.slug,
        }
      : null,
    scopes: authResult.auth.scopes,
    memberships,
  });
}
