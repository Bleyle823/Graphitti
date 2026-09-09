import { eq } from "drizzle-orm";
import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { userWallets } from "@/lib/db/schema";
import { getPrivyGasConfig } from "@/lib/web3/privy-gas";

export function OPTIONS() {
  return b2bOptions();
}

export async function GET(request: Request) {
  const authResult = await requireB2bAuth(request.headers.get("Authorization"), [
    "wallet:read",
  ]);
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const wallet = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, authResult.auth.userId),
  });

  const gas = getPrivyGasConfig();

  return b2bJson({
    address: wallet?.address ?? null,
    privy_wallet_id: wallet?.privyWalletId ?? null,
    privy_user_id: wallet?.privyUserId ?? null,
    gasless_enabled: Boolean(wallet),
    gas_mode: gas.mode,
    gas_asset: gas.asset,
  });
}
