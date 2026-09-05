import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userWallets } from "@/lib/db/schema";
import {
  pickEmbeddedWallet,
  verifyPrivyAccessToken,
} from "@/lib/web3/verify-privy-token";

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
    const walletId = body.walletId || fromUser?.walletId;
    const address = body.address || fromUser?.address;
    const privyUserId = body.privyUserId || verified.privyUserId;

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

    return NextResponse.json({
      address: row.address,
      privyWalletId: row.privyWalletId,
      privyUserId: row.privyUserId,
      gaslessEnabled: true,
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
