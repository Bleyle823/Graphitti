import "server-only";

/** Stub: Graphitti uses Privy-sponsored txs; native balance preflight deferred. */
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
