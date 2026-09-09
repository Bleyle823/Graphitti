import { eq } from "drizzle-orm";
import { requireB2bAuth, resolveOrganizationId } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { organizationIntents } from "@/lib/db/schema";
import { requireOrgMemberForUser } from "@/lib/org/auth-helpers";
import { signPrivyIntent } from "@/lib/web3/privy-client";

export function OPTIONS() {
  return b2bOptions();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ intentId: string }> }
) {
  const authResult = await requireB2bAuth(request.headers.get("Authorization"), [
    "treasury:approve",
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
    "owner"
  );
  if (!access.success) {
    return b2bError(access.error, access.status);
  }

  const { intentId } = await context.params;
  const intentRow = await db.query.organizationIntents.findFirst({
    where: eq(organizationIntents.privyIntentId, intentId),
  });

  if (!intentRow || intentRow.organizationId !== organizationId) {
    return b2bError("Intent not found", 404);
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

    return b2bJson({ intent: signed });
  } catch (error) {
    return b2bError(
      error instanceof Error ? error.message : "Failed to approve intent",
      502
    );
  }
}
