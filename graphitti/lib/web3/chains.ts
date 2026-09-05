export type SupportedChain = {
  id: string;
  label: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeSymbol: string;
  nativeDecimals: number;
  cctpDomain?: number;
};

export const ARC_USDC_ERC20 =
  "0x3600000000000000000000000000000000000000" as const;

export const ARC_SYSTEM_EMITTER =
  "0xffffffffffffffffffffffffffffffffffffffffffe" as const;

export const CHAINS: Record<string, SupportedChain> = {
  ethereum: {
    id: "ethereum",
    label: "Ethereum",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    cctpDomain: 0,
  },
  base: {
    id: "base",
    label: "Base",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    cctpDomain: 6,
  },
  arbitrum: {
    id: "arbitrum",
    label: "Arbitrum",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    cctpDomain: 3,
  },
  optimism: {
    id: "optimism",
    label: "Optimism",
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    cctpDomain: 2,
  },
  polygon: {
    id: "polygon",
    label: "Polygon",
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    nativeSymbol: "POL",
    nativeDecimals: 18,
    cctpDomain: 7,
  },
  "arc-testnet": {
    id: "arc-testnet",
    label: "Arc Testnet",
    chainId: 5042002,
    rpcUrl: "https://rpc.testnet.arc.network",
    explorerUrl: "https://testnet.arcscan.app",
    nativeSymbol: "USDC",
    nativeDecimals: 18,
    cctpDomain: 26,
  },
  sepolia: {
    id: "sepolia",
    label: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: "https://rpc.sepolia.org",
    explorerUrl: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
  },
};

export const NETWORK_SELECT_OPTIONS = Object.values(CHAINS).map((chain) => ({
  value: chain.id,
  label: chain.label,
}));

export function getChain(network: string): SupportedChain | undefined {
  return CHAINS[network];
}

export function requireChain(network: string): SupportedChain {
  const chain = getChain(network);
  if (!chain) {
    throw new Error(
      `Unsupported network "${network}". Use ethereum, sepolia, base, arbitrum, optimism, polygon, or arc-testnet.`
    );
  }
  return chain;
}

export function toCaip2(chain: SupportedChain): string {
  return `eip155:${chain.chainId}`;
}

export function formatUnits(valueHexOrDec: string, decimals: number): string {
  const raw = valueHexOrDec.startsWith("0x")
    ? BigInt(valueHexOrDec)
    : BigInt(valueHexOrDec);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  if (frac === BigInt(0)) {
    return whole.toString();
  }
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

export function parseUnits(amount: string, decimals: number): bigint {
  const [wholePart, fracPart = ""] = amount.trim().split(".");
  const frac = fracPart.padEnd(decimals, "0").slice(0, decimals);
  return (
    BigInt(wholePart || "0") * BigInt(10) ** BigInt(decimals) +
    BigInt(frac || "0")
  );
}
