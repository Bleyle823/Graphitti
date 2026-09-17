import {
  ARC_GENESIS,
  ARC_TESTNET_ADDRESSES,
  getArcAddresses,
  getArcConfig,
  getCircleSwapQuote,
} from "@/lib/arc/app-kit-flows";
import {
  CIRCLE_API,
  CIRCLE_GATEWAY,
  CIRCLE_GATEWAY_TESTNET,
  circleFetch,
} from "@/lib/circle/client";
import { fail, ok } from "@/lib/http-json";
import { padAddress, padUint } from "@/lib/web3/abi";
import { CHAINS } from "@/lib/web3/chains";
import type { ArcCredentials } from "./credentials";

/** Arc Testnet addresses. Prefer getArcAddresses(network) for mainnet. */
export const ARC_ADDRESSES = ARC_TESTNET_ADDRESSES;

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

export function tokenAddress(symbol: string, network = "arc-testnet"): string {
  const addresses = getArcAddresses(network);
  if (symbol === "EURC") {
    return addresses.eurcOfficial;
  }
  if (symbol === "cirBTC") {
    return "";
  }
  return addresses.usdcErc20;
}

export function gatewayApi(network = "arc-testnet") {
  return network === "arc-testnet" || network.includes("test")
    ? CIRCLE_GATEWAY_TESTNET
    : CIRCLE_GATEWAY;
}

export {
  ARC_GENESIS,
  CHAINS,
  CIRCLE_API,
  circleFetch,
  getArcAddresses,
  getArcConfig,
  getCircleSwapQuote,
};
