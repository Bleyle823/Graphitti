/**
 * Privy gas payment mode for the execution layer.
 *
 * - app-pays: app Privy gas credits cover fees (`sponsor: true`)
 * - user-pays: wallet pays gas in a stablecoin (no ETH). Requires dashboard
 *   "User pays" mode and `sponsor: true` + `sponsor_options.asset` on RPC.
 *
 * @see https://docs.privy.io/wallets/gas-and-asset-management/gas/setup
 */

export type PrivyGasMode = "user-pays" | "app-pays";

export type PrivyGasAsset = "usdc" | "usdt" | "eurc" | "usdg";

export type PrivySponsorOptions = {
  asset: PrivyGasAsset;
};

export type PrivyGasConfig = {
  mode: PrivyGasMode;
  asset: PrivyGasAsset;
  /** Whether eth_sendTransaction should request sponsorship */
  sponsor: boolean;
  /** Present only for user-pays (wallet pays gas in the named asset) */
  sponsorOptions?: PrivySponsorOptions;
};

const VALID_ASSETS = new Set<PrivyGasAsset>(["usdc", "usdt", "eurc", "usdg"]);

/**
 * Chains and assets Privy's ERC-20 paymaster accepts for user-pays gas.
 *
 * @see https://docs.privy.io/wallets/gas-and-asset-management/gas/setup#user-pays
 */
const USER_PAYS_ASSETS_BY_CHAIN_ID: Record<number, PrivyGasAsset[]> = {
  1: ["usdc", "usdt", "eurc", "usdg"],
  10: ["usdc", "usdt"],
  137: ["usdc", "usdt"],
  8453: ["usdc", "usdt", "eurc"],
  42161: ["usdc", "usdt"],
  80002: ["usdc"],
  84532: ["usdc", "usdt", "eurc"],
  421614: ["usdc"],
  11155111: ["usdc", "usdt", "eurc", "usdg"],
  11155420: ["usdc"],
};

export function getPrivyGasMode(): PrivyGasMode {
  const raw = process.env.PRIVY_GAS_MODE?.trim().toLowerCase();
  if (raw === "app-pays") {
    return "app-pays";
  }
  // Default: user pays gas in stablecoin (gasless ETH)
  return "user-pays";
}

export function getPrivyGasAsset(): PrivyGasAsset {
  const raw = process.env.PRIVY_GAS_ASSET?.trim().toLowerCase();
  if (raw && VALID_ASSETS.has(raw as PrivyGasAsset)) {
    return raw as PrivyGasAsset;
  }
  return "usdc";
}

/**
 * Build sponsor fields for Privy wallet RPC eth_sendTransaction / wallet_sendCalls.
 */
export function getPrivyGasConfig(): PrivyGasConfig {
  const mode = getPrivyGasMode();
  const asset = getPrivyGasAsset();

  if (mode === "user-pays") {
    return {
      mode,
      asset,
      sponsor: true,
      sponsorOptions: { asset },
    };
  }

  return {
    mode,
    asset,
    sponsor: true,
  };
}

/** Arc and similar chains use native USDC for gas — Privy paymaster is unsupported. */
export function chainUsesNativeStableGas(chain: {
  chainId: number;
  nativeSymbol: string;
}): boolean {
  return chain.chainId === 5_042_002 || chain.nativeSymbol === "USDC";
}

/** True when Privy's ERC-20 paymaster covers this chain/asset pair. */
export function supportsUserPaysGas(
  chain: { chainId: number },
  asset: PrivyGasAsset
): boolean {
  return USER_PAYS_ASSETS_BY_CHAIN_ID[chain.chainId]?.includes(asset) ?? false;
}

/** How a single send attempt pays for gas. */
export type PrivyGasAttempt = {
  /** user-pays | app-pays | self-pay (wallet's own native balance) */
  label: string;
  sponsor: boolean;
  sponsorOptions?: PrivySponsorOptions;
  asset?: PrivyGasAsset;
};

/**
 * Ordered gas payment attempts for a chain, most preferred first.
 *
 * Sponsorship depends on wallet token balances and dashboard configuration that
 * the app cannot read, so a send walks this list until one attempt is accepted.
 */
export function getPrivyGasAttempts(chain: {
  chainId: number;
  nativeSymbol: string;
}): PrivyGasAttempt[] {
  const asset = getPrivyGasAsset();
  const selfPay: PrivyGasAttempt = { label: "self-pay", sponsor: false };

  // Arc-style chains charge gas in the native stablecoin: no paymaster exists,
  // and requesting one makes Privy reject the request outright.
  if (chainUsesNativeStableGas(chain)) {
    return [selfPay];
  }

  const appPays: PrivyGasAttempt = { label: "app-pays", sponsor: true };
  if (!supportsUserPaysGas(chain, asset)) {
    return [appPays, selfPay];
  }

  const userPays: PrivyGasAttempt = {
    label: "user-pays",
    sponsor: true,
    sponsorOptions: { asset },
    asset,
  };
  return getPrivyGasMode() === "app-pays"
    ? [appPays, userPays, selfPay]
    : [userPays, appPays, selfPay];
}

/** True when the wallet does not need native ETH for gas. */
export function isPrivyGaslessEth(): boolean {
  return getPrivyGasMode() === "user-pays" || getPrivyGasMode() === "app-pays";
}
