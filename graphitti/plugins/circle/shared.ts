import { constants, publicEncrypt, randomUUID } from "node:crypto";
import { ARC_GENESIS } from "@/lib/arc/app-kit-flows";
import {
  CIRCLE_API,
  CIRCLE_GATEWAY,
  CIRCLE_IRIS,
  circleFetch,
} from "@/lib/circle/client";
import { fail, ok } from "@/lib/http-json";
import { padAddress, padUint } from "@/lib/web3/abi";
import { ARC_USDC_ERC20, getChain } from "@/lib/web3/chains";
import type { CircleCredentials } from "./credentials";

export const CIRCLE_IRIS_SANDBOX = "https://iris-api-sandbox.circle.com";
export const CIRCLE_GATEWAY_TESTNET = "https://gateway-api-testnet.circle.com";

export const GRAPH_X402_HOSTS = [
  "gateway.thegraph.com",
  "thegraph.com",
  "api.thegraph.com",
];

export const TOKEN_ADDRESSES = {
  USDC: {
    ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    optimism: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    "arc-testnet": ARC_USDC_ERC20,
  },
  EURC: {
    ethereum: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c",
    "arc-testnet": ARC_GENESIS.eurc,
  },
} as const;

export const CCTP_DOMAINS: Record<string, number> = {
  ethereum: 0,
  sepolia: 0,
  base: 6,
  arbitrum: 3,
  optimism: 2,
  polygon: 7,
  "arc-testnet": 26,
};

export const TOKEN_MESSENGER_V2 = {
  mainnet: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  testnet: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
} as const;

export const MESSAGE_TRANSMITTER_V2 = {
  mainnet: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
  testnet: ARC_GENESIS.messageTransmitter,
} as const;

export const GATEWAY_WALLET = {
  mainnet: "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE",
  testnet: ARC_GENESIS.gatewayWallet,
} as const;

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

export function isTestnetNetwork(network: string): boolean {
  return network.includes("testnet") || network.includes("sepolia");
}

export function tokenMessenger(network: string): string {
  return isTestnetNetwork(network)
    ? TOKEN_MESSENGER_V2.testnet
    : TOKEN_MESSENGER_V2.mainnet;
}

export function messageTransmitter(network: string): string {
  if (network === "arc-testnet") {
    return ARC_GENESIS.messageTransmitter;
  }
  return isTestnetNetwork(network)
    ? MESSAGE_TRANSMITTER_V2.testnet
    : MESSAGE_TRANSMITTER_V2.mainnet;
}

export function gatewayWallet(network: string): string {
  return isTestnetNetwork(network)
    ? GATEWAY_WALLET.testnet
    : GATEWAY_WALLET.mainnet;
}

export function irisBase(network: string): string {
  return isTestnetNetwork(network) ? CIRCLE_IRIS_SANDBOX : CIRCLE_IRIS;
}

export function gatewayApi(network: string): string {
  return isTestnetNetwork(network) ? CIRCLE_GATEWAY_TESTNET : CIRCLE_GATEWAY;
}

export function lookupToken(
  symbol: "USDC" | "EURC",
  network: string
): { address: string; decimals: number; nativeDecimals?: number } | undefined {
  const table = TOKEN_ADDRESSES[symbol] as Record<string, string>;
  const address = table[network];
  if (!address) {
    return;
  }
  if (symbol === "USDC" && network === "arc-testnet") {
    return { address, decimals: 6, nativeDecimals: 18 };
  }
  return { address, decimals: 6 };
}

export function requireApiKey(credentials: CircleCredentials) {
  const apiKey = credentials.CIRCLE_API_KEY;
  if (!apiKey) {
    return fail(
      "CIRCLE_API_KEY is not configured. Add it in Project Integrations. Do not use CIRCLE_MINT_API_KEY on api.circle.com."
    );
  }
  return { success: true as const, apiKey };
}

export function requireMintKey(credentials: CircleCredentials) {
  const apiKey = credentials.CIRCLE_MINT_API_KEY;
  if (!apiKey) {
    return fail(
      "CIRCLE_MINT_API_KEY is not configured. Mint actions use api-sandbox.circle.com only."
    );
  }
  return { success: true as const, apiKey };
}

export function newIdempotencyKey(): string {
  return randomUUID();
}

export async function entitySecretCiphertext(
  credentials: CircleCredentials
): Promise<
  { success: true; ciphertext: string } | { success: false; error: { message: string } }
> {
  const apiKey = credentials.CIRCLE_API_KEY;
  const secret = credentials.CIRCLE_ENTITY_SECRET;
  if (!apiKey) {
    return fail("CIRCLE_API_KEY is required to encrypt the entity secret");
  }
  if (!secret) {
    return fail(
      "CIRCLE_ENTITY_SECRET is required for this developer-controlled write"
    );
  }

  const keyResult = await circleFetch<{
    data?: { publicKey?: string };
    publicKey?: string;
  }>({
    baseUrl: CIRCLE_API,
    path: "/v2/w3s/config/entity/publicKey",
    apiKey,
  });
  const pem =
    keyResult.data?.data?.publicKey ?? keyResult.data?.publicKey;
  if (keyResult.error || !pem) {
    const fallback = await circleFetch<{
      data?: { publicKey?: string };
      publicKey?: string;
    }>({
      baseUrl: CIRCLE_API,
      path: "/v1/w3s/config/entity/publicKey",
      apiKey,
    });
    const fallbackPem =
      fallback.data?.data?.publicKey ?? fallback.data?.publicKey;
    if (fallback.error || !fallbackPem) {
      return fail(
        keyResult.error ?? fallback.error ?? "Could not load Circle entity public key"
      );
    }
    return encryptSecret(secret, fallbackPem);
  }
  return encryptSecret(secret, pem);
}

function encryptSecret(entitySecret: string, publicKeyPem: string) {
  try {
    const raw = Buffer.from(entitySecret.replace(/^0x/i, ""), "hex");
    if (raw.length !== 32) {
      return fail("CIRCLE_ENTITY_SECRET must be 32-byte hex");
    }
    const ciphertext = publicEncrypt(
      {
        key: publicKeyPem,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      raw
    ).toString("base64");
    return { success: true as const, ciphertext };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
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

export async function circleApi<T>(options: {
  path: string;
  apiKey: string;
  method?: string;
  body?: unknown;
}) {
  return circleResult(
    await circleFetch<T>({
      baseUrl: CIRCLE_API,
      path: options.path,
      apiKey: options.apiKey,
      method: options.method,
      body: options.body,
    })
  );
}

export function rejectGraphX402(url: string) {
  try {
    const host = new URL(url).host.toLowerCase();
    if (
      GRAPH_X402_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`)) ||
      url.includes("/x402/subgraphs")
    ) {
      return fail(
        "Refusing to pay a The Graph x402 URL. Graph query_url_x402 must stay unpaid."
      );
    }
    return;
  } catch {
    return fail("Invalid x402 URL");
  }
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

export function encodeGatewayDeposit(token: string, amount: bigint) {
  return encodeAddressUint(SELECTORS.gatewayDeposit, token, amount);
}

export function usdcDecimals(network: string, kind: "erc20" | "native" = "erc20") {
  if (network === "arc-testnet" && kind === "native") {
    return 18;
  }
  return 6;
}

export function explorerTx(network: string, hash: string) {
  const chain = getChain(network);
  return chain ? `${chain.explorerUrl}/tx/${hash}` : hash;
}

export function faucetNote() {
  return "Request test USDC or EURC at https://faucet.circle.com";
}
