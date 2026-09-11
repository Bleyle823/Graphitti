import {
  getAddressUrl as buildAddressUrl,
  getTransactionUrl as buildTransactionUrl,
} from "@/lib/explorer";
import type { ExplorerConfig } from "@/lib/explorer/types";
import { CHAINS } from "@/lib/web3/chains";

const cache = new Map<number, ExplorerConfig | null>();

export function clearExplorerConfigCache(): void {
  cache.clear();
}

function chainIdToExplorerConfig(chainId: number): ExplorerConfig | undefined {
  const chain = Object.values(CHAINS).find(
    (entry) => entry.chainId === chainId
  );
  if (!chain) {
    return;
  }
  return {
    chainId: chain.chainId,
    chainType: "evm",
    explorerUrl: chain.explorerUrl,
    explorerAddressPath: "/address/{address}",
    explorerTxPath: "/tx/{hash}",
    explorerContractPath: "/address/{address}",
    explorerApiUrl: null,
    explorerApiType: "etherscan",
  };
}

export async function getExplorerConfigForChain(
  chainId: number
): Promise<ExplorerConfig | undefined> {
  if (cache.has(chainId)) {
    return cache.get(chainId) ?? undefined;
  }

  const config = chainIdToExplorerConfig(chainId) ?? null;
  cache.set(chainId, config);
  return config ?? undefined;
}

export async function buildChainTransactionUrl(
  chainId: number,
  txHash: string
): Promise<string> {
  const config = await getExplorerConfigForChain(chainId);
  if (!config) {
    return "";
  }
  return buildTransactionUrl(config, txHash);
}

export async function buildChainAddressUrl(
  chainId: number,
  address: string
): Promise<string> {
  const config = await getExplorerConfigForChain(chainId);
  if (!config) {
    return "";
  }
  return buildAddressUrl(config, address);
}
