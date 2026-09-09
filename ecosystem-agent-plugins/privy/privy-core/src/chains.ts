export type SupportedChain = {
  id: string;
  chainId: number;
  explorerUrl: string;
  nativeDecimals: number;
};

const CHAINS: Record<string, SupportedChain> = {
  ethereum: { id: "ethereum", chainId: 1, explorerUrl: "https://etherscan.io", nativeDecimals: 18 },
  base: { id: "base", chainId: 8453, explorerUrl: "https://basescan.org", nativeDecimals: 18 },
  base_sepolia: {
    id: "base_sepolia",
    chainId: 84_532,
    explorerUrl: "https://sepolia.basescan.org",
    nativeDecimals: 18,
  },
  sepolia: {
    id: "sepolia",
    chainId: 11_155_111,
    explorerUrl: "https://sepolia.etherscan.io",
    nativeDecimals: 18,
  },
  ethereum_sepolia: {
    id: "ethereum_sepolia",
    chainId: 11_155_111,
    explorerUrl: "https://sepolia.etherscan.io",
    nativeDecimals: 18,
  },
};

export function requireChain(network: string): SupportedChain {
  const chain = CHAINS[network];
  if (!chain) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return chain;
}

export function toCaip2(chain: SupportedChain): string {
  return `eip155:${chain.chainId}`;
}

export function parseUnits(value: string, decimals: number): bigint {
  const [whole, fraction = ""] = value.split(".");
  const padded = `${fraction}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(`${whole}${padded}`);
}
