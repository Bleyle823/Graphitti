const tails = new Map<string, Promise<void>>();

export function walletSendLockKey(
  walletId: string,
  chainId: number | string
): string {
  return `${walletId}:${chainId}`;
}

/**
 * Run Privy/Arc broadcasts for one wallet on one chain one at a time.
 *
 * Parallel workflow branches otherwise read the same pending nonce, then the
 * second broadcast is rejected as "replacement fee too low".
 */
export function withSerializedWalletSend<T>(
  walletId: string,
  chainId: number | string,
  run: () => Promise<T>
): Promise<T> {
  const key = walletSendLockKey(walletId, chainId);
  const previous = tails.get(key) ?? Promise.resolve();
  const current = previous.then(run, run);
  tails.set(
    key,
    current.then(
      () => {
        // Keep the per-wallet queue moving after a successful broadcast.
      },
      () => {
        // A failed send must not stall later broadcasts for this wallet.
      }
    )
  );
  return current;
}

export function resetWalletSendLocks(): void {
  tails.clear();
}
