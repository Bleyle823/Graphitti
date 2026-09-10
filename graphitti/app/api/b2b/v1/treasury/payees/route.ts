import { and, eq } from "drizzle-orm";
import { ethers } from "ethers";
import { normalizeAddressForStorage } from "@/lib/address-utils";
import { requireB2bAuth, resolveOrganizationId } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { organizationPayees } from "@/lib/db/schema";
import { listOrgPayees, requireOrgMemberForUser } from "@/lib/org/auth-helpers";
import { syncPayeeAllowlist } from "@/lib/privy/sync-payee-allowlist";

export function OPTIONS() {
  return b2bOptions();
}

export async function GET(request: Request) {
  const authResult = await requireB2bAuth(
    request.headers.get("Authorization"),
    ["treasury:read"]
  );
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

  const payees = await listOrgPayees(organizationId);
  return b2bJson({ payees, count: payees.length });
}

export async function POST(request: Request) {
  const authResult = await requireB2bAuth(
    request.headers.get("Authorization"),
    ["treasury:write"]
  );
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const body = (await request.json()) as {
    organizationId?: string;
    label?: string;
    address?: string;
    defaultAmountUsdc?: string;
    chain?: string;
  };

  const organizationId = resolveOrganizationId(
    authResult.auth,
    body.organizationId
  );
  if (!organizationId) {
    return b2bError("organizationId is required on org-scoped API keys", 400);
  }

  const access = await requireOrgMemberForUser(
    authResult.auth.userId,
    organizationId,
    "admin"
  );
  if (!access.success) {
    return b2bError(access.error, access.status);
  }

  if (!(body.label && body.address)) {
    return b2bError("label and address are required", 400);
  }

  if (!ethers.isAddress(body.address)) {
    return b2bError("Enter a valid EVM payee address", 400);
  }

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
  return b2bJson({
    payee,
    policySynced: policy.synced,
    policyWarning: policy.error,
  });
}

export async function DELETE(request: Request) {
  const authResult = await requireB2bAuth(
    request.headers.get("Authorization"),
    ["treasury:write"]
  );
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const payeeId = searchParams.get("id");
  const organizationId = resolveOrganizationId(
    authResult.auth,
    searchParams.get("organizationId") ?? undefined
  );
  if (!(payeeId && organizationId)) {
    return b2bError("id and organizationId are required", 400);
  }

  const access = await requireOrgMemberForUser(
    authResult.auth.userId,
    organizationId,
    "admin"
  );
  if (!access.success) {
    return b2bError(access.error, access.status);
  }

  const existing = await db.query.organizationPayees.findFirst({
    where: and(
      eq(organizationPayees.id, payeeId),
      eq(organizationPayees.organizationId, organizationId)
    ),
  });
  if (!existing) {
    return b2bError("Payee not found", 404);
  }

  await db.delete(organizationPayees).where(eq(organizationPayees.id, payeeId));
  const policy = await syncPayeeAllowlist(organizationId);
  return b2bJson({
    success: true,
    policySynced: policy.synced,
    policyWarning: policy.error,
  });
}
