/**
 * RPC Config Service - resolves RPC URLs from static chain definitions.
 */

import { CHAINS } from "@/lib/web3/chains";
import type { ResolvedRpcConfig } from "./types";

export type ResolveRpcConfigOptions = {
  usePrivateMempool?: boolean;
  strict?: boolean;
};

function findChainById(chainId: number) {
  return Object.values(CHAINS).find((chain) => chain.chainId === chainId);
}

export async function resolveRpcConfig(
  chainId: number,
  _userId?: string,
  _options: ResolveRpcConfigOptions = {}
): Promise<ResolvedRpcConfig | null> {
  const chain = findChainById(chainId);
  if (!chain) {
    return null;
  }

  return {
    chainId: chain.chainId,
    chainName: chain.label,
    primaryRpcUrl: chain.rpcUrl,
    source: "default",
    usePrivateMempoolRpc: false,
  };
}

export async function getUserRpcPreferences(
  _userId: string,
  _chainId: number
): Promise<null> {
  return null;
}

export async function upsertUserRpcPreference(): Promise<never> {
  throw new Error("User RPC preferences are not supported in Graphitti");
}

export async function deleteUserRpcPreference(): Promise<never> {
  throw new Error("User RPC preferences are not supported in Graphitti");
}
