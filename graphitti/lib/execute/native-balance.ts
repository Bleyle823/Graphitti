import "server-only";

/** Stub: Graphitti uses Privy gas (user-pays USDC or app-pays credits); native ETH preflight deferred. */
export async function getNativeBalanceForAddress(
  _chainId: number,
  _address: string
): Promise<bigint> {
  return 0n;
}

export function formatNativeBalanceShortfall(
  _required: bigint,
  _available: bigint,
  _symbol: string
): string {
  return "Insufficient native balance";
}
