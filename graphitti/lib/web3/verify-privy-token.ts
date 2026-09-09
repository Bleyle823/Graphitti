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
    new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`)
  );

  const { payload } = await jwtVerify(token, jwks, {
    issuer: "privy.io",
    audience: appId,
    algorithms: ["ES256"],
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

  if (account.chain_type && account.chain_type !== "ethereum") {
    return false;
  }
  if (account.wallet_client_type && account.wallet_client_type !== "privy") {
    return false;
  }
  if (account.connector_type && account.connector_type !== "embedded") {
    return false;
  }
  return (
    account.wallet_client_type === "privy" ||
    account.connector_type === "embedded"
  );
}

export function pickEmbeddedWallet(user?: PrivyUser): {
  walletId: string;
  address: string;
  chainType: string;
} | null {
  // Prefer explicitly tagged Privy embedded linked accounts.
  const embeddedLinked = user?.linked_accounts?.find(
    isPrivyEmbeddedLinkedAccount
  );
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

  return null;
}

/** True when the wallet id belongs to a Privy embedded Ethereum wallet on this user. */
export function isEmbeddedWalletId(
  user: PrivyUser | undefined,
  walletId: string
): boolean {
  if (!walletId) {
    return false;
  }

  const embedded = pickEmbeddedWallet(user);
  if (embedded?.walletId === walletId) {
    return true;
  }

  const linked = user?.linked_accounts?.find(
    (account) =>
      isPrivyEmbeddedLinkedAccount(account) &&
      (account.id === walletId ||
        account.address?.toLowerCase() === walletId.toLowerCase())
  );
  if (linked) {
    return true;
  }

  return Boolean(
    user?.wallets?.some(
      (wallet) =>
        wallet.id === walletId ||
        wallet.address?.toLowerCase() === walletId.toLowerCase()
    )
  );
}
