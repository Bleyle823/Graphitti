/**
 * Client helpers for selecting the Privy embedded Ethereum wallet used for
 * server-side workflow signing (privyWalletId must be a Privy embedded wallet).
 */

export type EmbeddedWalletRef = {
  address: string;
  walletId: string;
};

type WalletLike = {
  type?: string;
  address?: string | null;
  id?: string | null;
  walletClientType?: string | null;
  connectorType?: string | null;
  chainType?: string | null;
};

function isExternalWalletClient(
  walletClientType: string | null | undefined
): boolean {
  if (!walletClientType) {
    return false;
  }
  return walletClientType !== "privy";
}

function isPrivyEmbeddedEthereum(account: WalletLike): boolean {
  if (!account.address) {
    return false;
  }
  if (account.type && account.type !== "wallet") {
    return false;
  }
  if (account.chainType && account.chainType !== "ethereum") {
    return false;
  }
  // MetaMask / injected connectors are never the execution wallet.
  if (isExternalWalletClient(account.walletClientType)) {
    return false;
  }
  if (account.connectorType && account.connectorType !== "embedded") {
    return false;
  }
  // Privy embedded wallets report walletClientType "privy". connectorType is
  // often "embedded" but can be omitted right after createOnLogin.
  return (
    account.walletClientType === "privy" || account.connectorType === "embedded"
  );
}

/**
 * Pick the first Privy embedded Ethereum wallet from linked accounts.
 */
export function pickEmbeddedWalletFromLinkedAccounts(
  accounts: WalletLike[] | undefined | null
): EmbeddedWalletRef | null {
  if (!accounts?.length) {
    return null;
  }

  const match = accounts.find(isPrivyEmbeddedEthereum);
  if (!match?.address) {
    return null;
  }

  return {
    address: match.address,
    walletId: match.id || match.address,
  };
}

/**
 * Pick an embedded wallet from useWallets() results.
 * ConnectedWallet from Privy exposes walletClientType / connectorType / address.
 */
export function pickEmbeddedWalletFromWallets(
  wallets: WalletLike[] | undefined | null
): EmbeddedWalletRef | null {
  if (!wallets?.length) {
    return null;
  }

  const match = wallets.find(isPrivyEmbeddedEthereum);

  if (!match?.address) {
    return null;
  }

  const walletId = match.id || match.address;
  return {
    address: match.address,
    walletId,
  };
}
