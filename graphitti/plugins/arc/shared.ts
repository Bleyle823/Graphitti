import {
  ARC_GENESIS,
  getArcConfig,
  getCircleSwapQuote,
} from "@/lib/arc/app-kit-flows";
import { CIRCLE_API, CIRCLE_GATEWAY, circleFetch } from "@/lib/circle/client";
import { fail, ok } from "@/lib/http-json";
import { padAddress, padUint } from "@/lib/web3/abi";
import { ARC_USDC_ERC20, CHAINS } from "@/lib/web3/chains";
import type { ArcCredentials } from "./credentials";

export const CIRCLE_GATEWAY_TESTNET = "https://gateway-api-testnet.circle.com";

export const ARC_ADDRESSES = {
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

export const SELECTORS = {
  depositForBurnV2: "0xad5378c7",
  receiveMessage: "0x57ecfd28",
  gatewayDeposit: "0x6e553f65",
  gatewayDepositFor: "0x2d757dc0",
  gatewayAddDelegate: "0x14041d8b",
  gatewayRemoveDelegate: "0x5c19a95c",
  gatewayInitiateWithdrawal: "0x0454774b",
  gatewayWithdraw: "0x51cff8d9",
  isAuthorizedForBalance: "0x3e413bee",
} as const;

export function requireCircleKey(credentials: ArcCredentials) {
  if (!credentials.CIRCLE_API_KEY) {
    return fail("CIRCLE_API_KEY is not configured. Add it in Project Integrations.");
  }
  return { success: true as const, apiKey: credentials.CIRCLE_API_KEY };
}

export function requireStableFxKey(credentials: ArcCredentials) {
  if (!credentials.CIRCLE_STABLEFX_API_KEY) {
    return fail("CIRCLE_STABLEFX_API_KEY is not configured.");
  }
  return { success: true as const, apiKey: credentials.CIRCLE_STABLEFX_API_KEY };
}

export function circleResult<T>(result: {
  httpStatus: number;
  data: T;
  error?: string;
}) {
  if (result.error) {
    return fail(result.error);
  }
  return ok(result.data);
}

export function encodeAddressUint(selector: string, address: string, value: bigint) {
  return `${selector}${padAddress(address)}${padUint(value)}`;
}

export function encodeTwoAddresses(selector: string, a: string, b: string) {
  return `${selector}${padAddress(a)}${padAddress(b)}`;
}

export function encodeDepositFor(token: string, depositor: string, value: bigint) {
  return `${SELECTORS.gatewayDepositFor}${padAddress(token)}${padAddress(depositor)}${padUint(value)}`;
}

export function encodeDepositForBurn(input: {
  amount: bigint;
  destinationDomain: number;
  mintRecipient: string;
  burnToken: string;
  destinationCaller?: string;
  maxFee: bigint;
  minFinalityThreshold: number;
}) {
  const recipient =
    input.mintRecipient.startsWith("0x") && input.mintRecipient.length === 66
      ? input.mintRecipient.slice(2)
      : padAddress(input.mintRecipient);
  const caller = input.destinationCaller
    ? padAddress(input.destinationCaller)
    : "0".repeat(64);
  return `${SELECTORS.depositForBurnV2}${padUint(input.amount)}${padUint(input.destinationDomain)}${recipient}${padAddress(input.burnToken)}${caller}${padUint(input.maxFee)}${padUint(input.minFinalityThreshold)}`;
}

function strip0x(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function padRightBytes(hex: string): string {
  const rem = hex.length % 64;
  return rem === 0 ? hex : hex + "0".repeat(64 - rem);
}

export function encodeReceiveMessage(message: string, attestation: string) {
  const a = strip0x(message);
  const b = strip0x(attestation);
  const aPadded = padRightBytes(a);
  const bPadded = padRightBytes(b);
  const offsetA = 64;
  const offsetB = 64 + 32 + aPadded.length / 2;
  return `${SELECTORS.receiveMessage}${padUint(offsetA)}${padUint(offsetB)}${padUint(a.length / 2)}${aPadded}${padUint(b.length / 2)}${bPadded}`;
}

export function tokenAddress(symbol: string): string {
  if (symbol === "EURC") {
    return ARC_ADDRESSES.eurc;
  }
  if (symbol === "cirBTC") {
    return "";
  }
  return ARC_ADDRESSES.usdcErc20;
}

export function gatewayApi(network = "arc-testnet") {
  return network === "arc-testnet" || network.includes("test")
    ? CIRCLE_GATEWAY_TESTNET
    : CIRCLE_GATEWAY;
}

export { ARC_GENESIS, CHAINS, CIRCLE_API, circleFetch, getArcConfig, getCircleSwapQuote };
