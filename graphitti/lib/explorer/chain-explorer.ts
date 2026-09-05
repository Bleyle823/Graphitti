import { requireChain } from "@/lib/web3/chains";
import type { ExplorerConfig } from "@/lib/explorer/types";

export function getExplorerConfigForNetwork(network: string): ExplorerConfig {
  const chain = requireChain(network);
  return {
    chainId: chain.chainId,
    chainType: "evm",
    explorerUrl: chain.explorerUrl ?? null,
    explorerAddressPath: "/address/{address}",
    explorerTxPath: "/tx/{hash}",
    explorerContractPath: "/address/{address}",
    explorerApiUrl: null,
    explorerApiType: "etherscan",
  };
}
