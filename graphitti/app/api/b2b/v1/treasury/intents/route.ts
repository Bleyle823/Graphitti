import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { requireB2bAuth, resolveOrganizationId } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { organizationIntents } from "@/lib/db/schema";
import { recordOrganizationIntent } from "@/lib/org/record-intent";
import { getOrganizationWallet } from "@/lib/web3/wallet-helpers";
import { requireOrgMemberForUser } from "@/lib/org/auth-helpers";
import {
  createPrivyTransferIntent,
  type WalletTransferRequest,
} from "@/lib/web3/privy-client";

export function OPTIONS() {
  return b2bOptions();
}

export async function POST(request: Request) {
  const authResult = await requireB2bAuth(request.headers.get("Authorization"), [
    "treasury:write",
  ]);
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const body = (await request.json()) as {
    organizationId?: string;
    amountUsdc?: string;
    toAddress?: string;
    payeeId?: string;
    sourceChain?: string;
    sourceAsset?: string;
  };

  const organizationId = resolveOrganizationId(authResult.auth, body.organizationId);
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

  if (!(body.amountUsdc && body.toAddress)) {
    return b2bError("amountUsdc and toAddress are required", 400);
  }

  const wallet = await getOrganizationWallet(organizationId);
  const transferBody: WalletTransferRequest = {
    source: {
      chain: body.sourceChain ?? "base_sepolia",
      asset: body.sourceAsset ?? "usdc",
    },
    destination: { address: body.toAddress },
    amount: body.amountUsdc,
    amount_type: "exact_input",
    nonce: randomUUID(),
    reference_id: randomUUID(),
  };

  try {
    const intent = await createPrivyTransferIntent(wallet.privyWalletId, transferBody);
    await recordOrganizationIntent({
      organizationId,
      privyIntentId: intent.intent_id,
      amountUsdc: body.amountUsdc,
      toAddress: body.toAddress,
    });
    return b2bJson({
      intent_id: intent.intent_id,
      status: intent.status,
      organization_id: organizationId,
    });
  } catch (error) {
    return b2bError(
      error instanceof Error ? error.message : "Failed to create treasury intent",
      502
    );
  }
}
