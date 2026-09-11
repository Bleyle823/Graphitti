/**
 * Chain Service - static chain list backed by lib/web3/chains.
 */

import { CHAINS } from "@/lib/web3/chains";

export type Chain = {
  id: string;
  chainId: number;
  name: string;
  symbol: string;
  chainType: string;
  primaryRpcUrl: string;
  isEnabled: boolean;
  isTestnet: boolean;
};

export type NewChain = Omit<Chain, "id"> & { id?: string };

function toChainRecord(chain: (typeof CHAINS)[string]): Chain {
  return {
    id: chain.id,
    chainId: chain.chainId,
    name: chain.label,
    symbol: chain.nativeSymbol,
    chainType: "evm",
    primaryRpcUrl: chain.rpcUrl,
    isEnabled: true,
    isTestnet: chain.id.includes("testnet") || chain.id === "sepolia",
  };
}

export async function getEnabledChains(): Promise<Chain[]> {
  return Object.values(CHAINS).map(toChainRecord);
}

export async function getAllChains(): Promise<Chain[]> {
  return getEnabledChains();
}

export async function getChainByChainId(
  chainId: number
): Promise<Chain | null> {
  const chain = Object.values(CHAINS).find(
    (entry) => entry.chainId === chainId
  );
  return chain ? toChainRecord(chain) : null;
}

export async function getChainById(id: string): Promise<Chain | null> {
  const chain = CHAINS[id];
  return chain ? toChainRecord(chain) : null;
}

export async function createChain(_chain: NewChain): Promise<Chain> {
  throw new Error("Chain admin is not supported in Graphitti");
}

export async function updateChain(
  _chainId: number,
  _updates: Partial<Omit<NewChain, "chainId">>
): Promise<Chain | null> {
  throw new Error("Chain admin is not supported in Graphitti");
}

export async function setChainEnabled(
  _chainId: number,
  _enabled: boolean
): Promise<Chain | null> {
  throw new Error("Chain admin is not supported in Graphitti");
}
