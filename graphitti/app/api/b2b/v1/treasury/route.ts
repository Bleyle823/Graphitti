import { eq } from "drizzle-orm";
import { requireB2bAuth, resolveOrganizationId } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { organizationIntents } from "@/lib/db/schema";
import {
  getOrgTreasury,
  listOrgPayees,
  requireOrgMemberForUser,
} from "@/lib/org/auth-helpers";

export function OPTIONS() {
  return b2bOptions();
}

export async function GET(request: Request) {
  const authResult = await requireB2bAuth(request.headers.get("Authorization"), [
    "treasury:read",
  ]);
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const organizationId = resolveOrganizationId(authResult.auth);
  if (!organizationId) {
    return b2bError("organizationId is required on org-scoped API keys", 400);
  }

  const access = await requireOrgMemberForUser(
    authResult.auth.userId,
    organizationId,
    "member"
  );
  if (!access.success) {
    return b2bError(access.error, access.status);
  }

  const treasury = await getOrgTreasury(organizationId);
  const payees = await listOrgPayees(organizationId);
  const intents = await db.query.organizationIntents.findMany({
    where: eq(organizationIntents.organizationId, organizationId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: 20,
  });

  return b2bJson({
    organization_id: organizationId,
    treasury,
    payees,
    intents,
  });
}
