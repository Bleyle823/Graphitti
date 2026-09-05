import "server-only";

/**
 * Graphitti passthrough for value-cap enforcement.
 * KeeperHub org spend caps are not used; workflow writes proceed directly.
 */
export async function withStepValueCap<T>(
  _options: unknown,
  run: () => Promise<T>
): Promise<T> {
  return run();
}
