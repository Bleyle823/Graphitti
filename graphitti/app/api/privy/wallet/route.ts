import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userWallets } from "@/lib/db/schema";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallet = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, session.user.id),
  });

  return NextResponse.json({
    address: wallet?.address ?? null,
    privyWalletId: wallet?.privyWalletId ?? null,
    gaslessEnabled: Boolean(wallet),
  });
}
