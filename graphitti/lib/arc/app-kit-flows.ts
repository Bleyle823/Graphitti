import {
  CIRCLE_API,
  CIRCLE_IRIS,
  CIRCLE_IRIS_SANDBOX,
  circleFetch,
} from "@/lib/circle/client";
import {
  ARC_CCTP_DOMAIN,
  ARC_USDC_ERC20,
  requireChain,
  resolveNetworkId,
} from "@/lib/web3/chains";

const SYSTEM_EMITTER = "0xfffffffffffffffffffffffffffffffffffffffe";
const MIN_MAX_FEE_PER_GAS_WEI = BigInt("20000000000");

export type ArcAddresses = {
  usdcNative: string;
  usdcErc20: string;
  usdc: string;
  eurc: string;
  eurcOfficial: string;
  cctpDomain: number;
  gatewayWallet: string;
  gatewayMinter: string;
  messageTransmitter: string;
  tokenMessenger: string;
  tokenMinter: string;
  messageV2: string;
  systemEmitter: string;
  usyc: string;
  usycEntitlements: string;
  usycTeller: string;
  fxEscrow: string;
  memo: string;
  multicall3From: string;
  create2: string;
  multicall3: string;
  permit2: string;
  minMaxFeePerGasWei: bigint;
};

/** Testnet genesis subset used by Circle plugin helpers. */
export const ARC_GENESIS = {
  usdcNative: "0x3600000000000000000000000000000000000000",
  usdcErc20: ARC_USDC_ERC20,
  eurc: "0x88f01492ef031e2dc03965e51503df937678bc94",
  cctpDomain: ARC_CCTP_DOMAIN,
  gatewayWallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
  gatewayMinter: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B",
  messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  systemEmitter: SYSTEM_EMITTER,
  minMaxFeePerGasWei: MIN_MAX_FEE_PER_GAS_WEI,
};

export const ARC_TESTNET_ADDRESSES: ArcAddresses = {
  ...ARC_GENESIS,
  usdc: ARC_USDC_ERC20,
  eurcOfficial: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
  usyc: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
  usycEntitlements: "0xcc205224862c7641930c87679e98999d23c26113",
  usycTeller: "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A",
  tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  tokenMinter: "0xb43db544E2c27092c107639Ad201b3dEfAbcF192",
  messageV2: "0xbaC0179bB358A8936169a63408C8481D582390C4",
  fxEscrow: "0xd68256f4D69C6BbEcB873D8588AE0Dc6B8E22E10",
  memo: "0x5294E9927c3306DcBaDb03fe70b92e01cCede505",
  multicall3From: "0x522fAf9A91c41c443c66765030741e4AaCe147D0",
  create2: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

export const ARC_MAINNET_ADDRESSES: ArcAddresses = {
  usdcNative: "0x3600000000000000000000000000000000000000",
  usdcErc20: ARC_USDC_ERC20,
  usdc: ARC_USDC_ERC20,
  eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
  eurcOfficial: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
  cctpDomain: ARC_CCTP_DOMAIN,
  gatewayWallet: "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE",
  gatewayMinter: "0x2222222d7164433c4C09B0b0D809a9b52C04C205",
  messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
  tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  tokenMinter: "0xfd78EE919681417d192449715b2594ab58f5D002",
  messageV2: "0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78",
  systemEmitter: SYSTEM_EMITTER,
  usyc: "0x8a5D989Bbb96929F689B0200f435f53dA42bF490",
  usycEntitlements: "0xb69ecb156Dc0028198028c501340d5367845ca72",
  usycTeller: "0x51A8CE47dC08ba5CD19c7aa84EA6fD6664f60f9b",
  fxEscrow: "0xe2E5F173576B513d994073CCbDaCBE027d43DFe6",
  memo: "0x5294E9927c3306DcBaDb03fe70b92e01cCede505",
  multicall3From: "0x522fAf9A91c41c443c66765030741e4AaCe147D0",
  create2: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  minMaxFeePerGasWei: MIN_MAX_FEE_PER_GAS_WEI,
};

export function resolveArcNetworkId(network?: string): "arc" | "arc-testnet" {
  const id = resolveNetworkId(network || "arc-testnet");
  if (id === "arc" || id === "arc-testnet") {
    return id;
  }
  throw new Error(
    `Expected Arc or Arc Testnet, got "${network ?? ""}". Use network "arc" or "arc-testnet".`
  );
}

export function getArcAddresses(network?: string): ArcAddresses {
  return resolveArcNetworkId(network) === "arc"
    ? ARC_MAINNET_ADDRESSES
    : ARC_TESTNET_ADDRESSES;
}

export function getArcConfig(network = "arc-testnet") {
  const chain = requireChain(resolveArcNetworkId(network));
  const addresses = getArcAddresses(chain.id);
  return {
    ...chain,
    genesis: addresses,
    nativeUsdcDecimals: 18,
    usdcErc20Decimals: 6,
    eurcDecimals: 6,
    note: "Native gas USDC is 18 decimals. The ERC-20 USDC interface and marketplace amounts use 6 decimals.",
  };
}

export async function getIrisAttestation(
  messageHash: string,
  network = "arc-testnet"
) {
  const id = resolveNetworkId(network);
  const sandbox = id.includes("testnet") || id.includes("sepolia");
  return circleFetch({
    baseUrl: sandbox ? CIRCLE_IRIS_SANDBOX : CIRCLE_IRIS,
    path: `/v2/messages/${ARC_CCTP_DOMAIN}?transactionHash=${encodeURIComponent(messageHash)}`,
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
