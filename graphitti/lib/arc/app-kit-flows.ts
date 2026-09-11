import { CIRCLE_API, CIRCLE_IRIS, circleFetch } from "@/lib/circle/client";
import { ARC_USDC_ERC20, CHAINS } from "@/lib/web3/chains";

export const ARC_GENESIS = {
  usdcNative: "0x3600000000000000000000000000000000000000",
  usdcErc20: ARC_USDC_ERC20,
  eurc: "0x88f01492ef031e2dc03965e51503df937678bc94",
  cctpDomain: 26,
  gatewayWallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
  gatewayMinter: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B",
  messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  systemEmitter: "0xfffffffffffffffffffffffffffffffffffffffe",
  minMaxFeePerGasWei: BigInt("20000000000"),
};

export function getArcConfig() {
  const chain = CHAINS["arc-testnet"];
  return {
    ...chain,
    genesis: ARC_GENESIS,
    nativeUsdcDecimals: 18,
    usdcErc20Decimals: 6,
    eurcDecimals: 6,
    note: "Native gas USDC is 18 decimals. The ERC-20 USDC interface and marketplace amounts use 6 decimals.",
  };
}

export async function getIrisAttestation(messageHash: string) {
  return circleFetch({
    baseUrl: CIRCLE_IRIS,
    path: `/v2/messages/26?transactionHash=${encodeURIComponent(messageHash)}`,
  });
}

export async function getCircleSwapQuote(options: {
  apiKey: string;
  fromToken: string;
  toToken: string;
  amount: string;
}) {
  return circleFetch({
    baseUrl: CIRCLE_API,
    path: "/v1/exchange/quotes",
    apiKey: options.apiKey,
    method: "POST",
    body: {
      from: options.fromToken,
      to: options.toToken,
      amount: options.amount,
    },
  });
}
