import { NextResponse } from "next/server";
import { CHAINS } from "@/lib/web3/chains";

export type ChainResponse = {
  id: string;
  chainId: number;
  name: string;
  symbol: string;
  chainType: string;
  explorerUrl: string | null;
  explorerAddressPath: string | null;
  explorerApiUrl: string | null;
  explorerApiType: string | null;
  isTestnet: boolean;
  isEnabled: boolean;
  usePrivateMempoolRpc: boolean;
};

export type GetChainsResponse = ChainResponse[];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeDisabled = searchParams.get("includeDisabled") === "true";

  const response: GetChainsResponse = Object.values(CHAINS).map((chain) => ({
    id: chain.id,
    chainId: chain.chainId,
    name: chain.label,
    symbol: chain.nativeSymbol,
    chainType: "evm",
    explorerUrl: chain.explorerUrl ?? null,
    explorerAddressPath: "/address/{address}",
    explorerApiUrl: null,
    explorerApiType: "etherscan",
    isTestnet:
      chain.id.includes("testnet") ||
      chain.id === "sepolia" ||
      chain.id === "base-sepolia",
    isEnabled: true,
    usePrivateMempoolRpc: false,
  }));

  return NextResponse.json(response);
}
