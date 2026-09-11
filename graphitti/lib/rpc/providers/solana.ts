import type { FailoverStateChangeCallback, RpcMetricsCollector } from "./index";

export type SolanaRpcMetricsCollector = RpcMetricsCollector;
export type SolanaFailoverStateChangeCallback = FailoverStateChangeCallback;

export type SolanaProviderManager = {
  executeWithFailover<T>(
    fn: (connection: unknown) => Promise<T>,
    operation?: string
  ): Promise<T>;
};

export const consoleSolanaMetricsCollector: SolanaRpcMetricsCollector = {
  recordPrimaryAttempt: () => {},
  recordPrimaryFailure: () => {},
  recordFallbackAttempt: () => {},
  recordFallbackFailure: () => {},
  recordFailoverEvent: () => {},
  recordRecoveryEvent: () => {},
  recordBothFailed: () => {},
  recordSuccess: () => {},
  recordLatency: () => {},
  recordErrorType: () => {},
};

export function createSolanaProviderManager(
  _options?: Record<string, unknown>
): SolanaProviderManager {
  throw new Error("Solana RPC is not supported in Graphitti");
}
