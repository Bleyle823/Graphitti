import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userWallets } from "@/lib/db/schema";
import { getOrgTreasury, requireOrgMember } from "@/lib/org/auth-helpers";
import { privyWalletTransfer } from "@/lib/web3/privy-client";

type FundBody = {
  organizationId?: string;
  amount?: string;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  const body = (await request.json()) as FundBody;
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

  if (!body.amount) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const treasury = await getOrgTreasury(organizationId);
  if (!treasury) {
    return NextResponse.json(
      { error: "Treasury wallet not provisioned" },
      { status: 404 }
    );
  }

  const personalWallet = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, access.user.id),
  });
  if (!personalWallet) {
    return NextResponse.json(
      { error: "Connect your Privy wallet before funding the treasury" },
      { status: 400 }
    );
  }

  try {
    const action = await privyWalletTransfer(personalWallet.privyWalletId, {
      source: { chain: "base_sepolia", asset: "usdc" },
      destination: {
        address: treasury.address,
        chain: "base_sepolia",
        asset: "usdc",
      },
      amount: body.amount,
      amount_type: "exact_input",
      nonce: randomUUID(),
      reference_id: randomUUID(),
    });

    return NextResponse.json({
      action,
      from: personalWallet.address,
      to: treasury.address,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fund treasury",
      },
      { status: 502 }
    );
  }
}
