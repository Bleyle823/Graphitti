import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { getPrivyAppId, getPrivyUser, type PrivyUser } from "./privy-client";

export async function verifyPrivyAccessToken(token: string): Promise<{
  privyUserId: string;
  user?: PrivyUser;
}> {
  const appId = getPrivyAppId();
  if (!appId) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not configured");
  }

  const jwks = createRemoteJWKSet(
    new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks`)
  );

  const { payload } = await jwtVerify(token, jwks, {
    issuer: "privy.io",
    audience: appId,
  });

  const privyUserId = typeof payload.sub === "string" ? payload.sub : "";
  if (!privyUserId) {
    throw new Error("Privy token is missing a subject");
  }

  try {
    const user = await getPrivyUser(privyUserId);
    return { privyUserId, user };
  } catch {
    return { privyUserId };
  }
}

function isPrivyEmbeddedLinkedAccount(account: {
  type: string;
  address?: string;
  chain_type?: string;
  wallet_client_type?: string;
  connector_type?: string;
}): boolean {
  if (account.type !== "wallet" || !account.address) {
    return false;
  }

  const isPrivyClient =
    !account.wallet_client_type || account.wallet_client_type === "privy";
  const isEmbedded =
    !account.connector_type || account.connector_type === "embedded";
  const isEthereum =
    !account.chain_type || account.chain_type === "ethereum";

  return isPrivyClient && isEmbedded && isEthereum;
}

export function pickEmbeddedWallet(user?: PrivyUser): {
  walletId: string;
  address: string;
  chainType: string;
} | null {
  // Prefer explicitly tagged Privy embedded linked accounts.
  const embeddedLinked = user?.linked_accounts?.find(isPrivyEmbeddedLinkedAccount);
  if (embeddedLinked?.address) {
    return {
      walletId: embeddedLinked.id || embeddedLinked.address,
      address: embeddedLinked.address,
      chainType: embeddedLinked.chain_type || "ethereum",
    };
  }

  // Privy user wallets array is typically embedded wallets for the user.
  const fromWallets = user?.wallets?.[0];
  if (fromWallets?.id && fromWallets.address) {
    return {
      walletId: fromWallets.id,
      address: fromWallets.address,
      chainType: fromWallets.chain_type || "ethereum",
    };
  }

  // Last resort: any wallet-shaped linked account with an address.
  const linked = user?.linked_accounts?.find(
    (account) => account.type === "wallet" && account.address
  );
  if (linked?.address) {
    return {
      walletId: linked.id || linked.address,
      address: linked.address,
      chainType: linked.chain_type || "ethereum",
    };
  }

  return null;
}
