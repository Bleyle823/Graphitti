import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userWallets, users } from "@/lib/db/schema";
import { cloneCatalogTemplatesForUser } from "@/lib/marketplace/clone-catalog";
import { getPrivyWallet } from "@/lib/web3/privy-client";
import {
  pickEmbeddedWallet,
  verifyPrivyAccessToken,
} from "@/lib/web3/verify-privy-token";

function isExternalWalletId(
  linkedAccounts:
    | Array<{
        type: string;
        id?: string;
        address?: string;
        wallet_client_type?: string;
      }>
    | undefined,
  walletId: string
): boolean {
  if (!linkedAccounts?.length) {
    return false;
  }
  return linkedAccounts.some(
    (account) =>
      account.type === "wallet" &&
      (account.id === walletId ||
        account.address?.toLowerCase() === walletId.toLowerCase()) &&
      Boolean(account.wallet_client_type) &&
      account.wallet_client_type !== "privy"
  );
}

function walletDisplayName(address: string): string {
  const normalized = address.trim();
  if (normalized.length < 10) {
    return normalized;
  }
  return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
}

async function promoteWalletUser(userId: string, address: string): Promise<void> {
  await db
    .update(users)
    .set({
      isAnonymous: false,
      name: walletDisplayName(address),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      walletId?: string;
      address?: string;
      privyUserId?: string;
    };

    if (!body.token) {
      return NextResponse.json(
        { error: "Privy access token is required" },
        { status: 400 }
      );
    }

    const verified = await verifyPrivyAccessToken(body.token);
    const fromUser = pickEmbeddedWallet(verified.user);

    if (
      body.walletId &&
      isExternalWalletId(verified.user?.linked_accounts, body.walletId)
    ) {
      return NextResponse.json(
        {
          error:
            "Only a Privy embedded wallet can be linked for gasless execution.",
        },
        { status: 400 }
      );
    }

    let walletId = fromUser?.walletId || body.walletId;
    let address = fromUser?.address || body.address;
    const privyUserId = body.privyUserId || verified.privyUserId;

    if (walletId && !fromUser) {
      try {
        const remote = await getPrivyWallet(walletId);
        walletId = remote.id;
        address = remote.address || address;
      } catch {
        // Token is already verified. Persist the client-reported embedded wallet
        // so the UI and later executions can proceed even if wallet GET is delayed.
      }
    }

    if (!walletId || !address) {
      return NextResponse.json(
        { error: "Create an embedded wallet in Privy, then try again." },
        { status: 400 }
      );
    }

    const existing = await db.query.userWallets.findFirst({
      where: eq(userWallets.userId, session.user.id),
    });

    const row = existing
      ? (
          await db
            .update(userWallets)
            .set({
              privyUserId,
              privyWalletId: walletId,
              address,
              chainType: "ethereum",
              updatedAt: new Date(),
            })
            .where(eq(userWallets.id, existing.id))
            .returning()
        )[0]
      : (
          await db
            .insert(userWallets)
            .values({
              userId: session.user.id,
              privyUserId,
              privyWalletId: walletId,
              address,
              chainType: "ethereum",
            })
            .returning()
        )[0];

    await promoteWalletUser(session.user.id, row.address);
    const cloned = await cloneCatalogTemplatesForUser(session.user.id);

    return NextResponse.json({
      address: row.address,
      privyWalletId: row.privyWalletId,
      privyUserId: row.privyUserId,
      gaslessEnabled: true,
      promoted: true,
      catalogCloned: cloned.created,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to link wallet",
      },
      { status: 400 }
    );
  }
}
