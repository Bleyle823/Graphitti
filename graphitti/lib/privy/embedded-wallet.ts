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

function isPrivyEmbeddedEthereum(account: WalletLike): boolean {
  return (
    account.type === "wallet" &&
    Boolean(account.address) &&
    account.walletClientType === "privy" &&
    account.connectorType === "embedded" &&
    (account.chainType === "ethereum" || !account.chainType)
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
  if (!(match?.address && match.id)) {
    return null;
  }

  return {
    address: match.address,
    walletId: match.id,
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

  const match = wallets.find(
    (wallet) =>
      Boolean(wallet.address) &&
      wallet.walletClientType === "privy" &&
      (wallet.connectorType === "embedded" || !wallet.connectorType) &&
      (wallet.chainType === "ethereum" || !wallet.chainType)
  );

  if (!match?.address) {
    return null;
  }

  const walletId = match.id || match.address;
  return {
    address: match.address,
    walletId,
  };
}
