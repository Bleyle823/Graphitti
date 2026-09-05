import "server-only";

import { getChainIdFromNetwork } from "@/lib/rpc/network-utils";
import { requireChain } from "@/lib/web3/chains";
import {
  fetchEtherscanAbi,
  fetchEtherscanSourceCode,
} from "@/lib/explorer/etherscan";

type AbiCacheEntry = {
  abi: string;
  fetchedAt: number;
};

type ResolveAbiInput = {
  contractAddress: string;
  network: string;
  abi?: string;
};

type ResolveAbiResult = {
  abi: string;
  source: "definition" | "cache" | "explorer";
};

const abiCache = new Map<string, AbiCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

const EXPLORER_API_BY_CHAIN: Record<number, string> = {
  1: "https://api.etherscan.io/api",
  11155111: "https://api-sepolia.etherscan.io/api",
  8453: "https://api.basescan.org/api",
  84532: "https://api-sepolia.basescan.org/api",
  42161: "https://api.arbiscan.io/api",
  10: "https://api-optimistic.etherscan.io/api",
  137: "https://api.polygonscan.com/api",
};

function buildCacheKey(chainId: number, contractAddress: string): string {
  return `${chainId}:${contractAddress.toLowerCase()}`;
}

async function fetchAbiFromExplorer(
  chainId: number,
  contractAddress: string
): Promise<string> {
  const explorerApiUrl = EXPLORER_API_BY_CHAIN[chainId];
  if (!explorerApiUrl) {
    throw new Error(`No explorer API configured for chain ${chainId}`);
  }

  const [directResult, sourceCodeResult] = await Promise.all([
    fetchEtherscanAbi(
      explorerApiUrl,
      chainId,
      contractAddress,
      ETHERSCAN_API_KEY
    ),
    fetchEtherscanSourceCode(
      explorerApiUrl,
      chainId,
      contractAddress,
      ETHERSCAN_API_KEY
    ),
  ]);

  if (
    sourceCodeResult.success &&
    sourceCodeResult.isProxy &&
    sourceCodeResult.implementationAddress
  ) {
    const implResult = await fetchEtherscanAbi(
      explorerApiUrl,
      chainId,
      sourceCodeResult.implementationAddress,
      ETHERSCAN_API_KEY
    );
    if (implResult.success && implResult.abi) {
      return JSON.stringify(implResult.abi);
    }
  }

  if (directResult.success && directResult.abi) {
    return JSON.stringify(directResult.abi);
  }

  throw new Error(
    directResult.error ?? `Failed to fetch ABI for ${contractAddress}`
  );
}

export async function resolveAbi(
  input: ResolveAbiInput
): Promise<ResolveAbiResult> {
  if (input.abi && input.abi.trim() !== "") {
    return { abi: input.abi, source: "definition" };
  }

  const chainId = getChainIdFromNetwork(input.network);
  requireChain(input.network);
  const cacheKey = buildCacheKey(chainId, input.contractAddress);
  const cached = abiCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { abi: cached.abi, source: "cache" };
  }

  const abi = await fetchAbiFromExplorer(chainId, input.contractAddress);
  abiCache.set(cacheKey, { abi, fetchedAt: Date.now() });
  return { abi, source: "explorer" };
}
