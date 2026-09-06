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

/** True when the wallet does not need native ETH for gas. */
export function isPrivyGaslessEth(): boolean {
  return getPrivyGasMode() === "user-pays" || getPrivyGasMode() === "app-pays";
}
