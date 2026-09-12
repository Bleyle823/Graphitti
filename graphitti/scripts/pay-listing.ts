/**
 * Pay a Graphitti listed workflow over Circle x402 (Arc Testnet).
 *
 * Usage (from graphitti/):
 *   pnpm pay-listing -- https://host/api/mcp/workflows/{slug}/call
 *   pnpm pay-listing -- https://host/api/mcp/workflows/{slug}/call --body "{\"input\":\"ping\"}"
 *
 * Requires PRIVATE_KEY in the environment or graphitti/.env.local.
 * That key's address must hold Arc USDC in Circle Gateway Wallet
 * 0x0077777d7EBA4688BDeF3E311b846F25870A19B9 (approve + deposit, not a raw transfer).
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { Wallet } from "ethers";

const GATEWAY_WALLET = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
const ARC_USDC = "0x3600000000000000000000000000000000000000";
const ARC_CHAIN_ID = 5_042_002;
const GATEWAY_API = "https://gateway-api-testnet.circle.com";
const ARC_DOMAIN = 26;
const VALIDITY_SECONDS = 60 * 60 * 24 * 8;
const LISTING_SUFFIX = /\/listing$/;
const WORKFLOW_PATH = /\/api\/mcp\/workflows\/([^/]+)\/?$/;

function loadEnv() {
  const files = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "graphitti", ".env.local"),
  ];
  for (const file of files) {
    if (existsSync(file)) {
      config({ path: file, override: false });
    }
  }
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return;
  }
  return process.argv[index + 1];
}

function listingUrl(): string {
  const flag = argValue("--url");
  const positional = process.argv
    .slice(2)
    .find((value) => value.startsWith("http") && !value.startsWith("--"));
  const raw = flag || positional;
  if (!raw) {
    throw new Error(
      "Pass the listing call URL: pnpm pay-listing -- https://host/api/mcp/workflows/{slug}/call"
    );
  }
  return resolveCallUrl(raw);
}

function resolveCallUrl(raw: string): string {
  const url = new URL(raw);
  if (url.pathname.endsWith("/call")) {
    return url.toString();
  }
  if (url.pathname.endsWith("/listing")) {
    url.pathname = url.pathname.replace(LISTING_SUFFIX, "/call");
    return url.toString();
  }
  const match = url.pathname.match(WORKFLOW_PATH);
  if (match?.[1] && match[1] !== "openapi") {
    url.pathname = `/api/mcp/workflows/${match[1]}/call`;
    return url.toString();
  }
  return url.toString();
}

function decodePaymentHeader(
  raw: string | null
): Record<string, unknown> | null {
  if (!raw) {
    return null;
  }
  for (const candidate of [Buffer.from(raw, "base64").toString("utf8"), raw]) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try next
    }
  }
  return null;
}

function asAccepts(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object"
  );
}

function pickAccept(
  header: Record<string, unknown> | null,
  body: unknown
): Record<string, unknown> | null {
  const bodyRecord =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const accepts = [
    ...asAccepts(header?.accepts),
    ...asAccepts(bodyRecord?.accepts),
  ];
  return (
    accepts.find((entry) => {
      const extra = entry.extra;
      return (
        extra &&
        typeof extra === "object" &&
        (extra as { name?: unknown }).name === "GatewayWalletBatched"
      );
    }) ??
    accepts[0] ??
    null
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function loadHint(address: string) {
  return {
    eoa: address,
    gatewayWallet: GATEWAY_WALLET,
    usdc: ARC_USDC,
    faucet: "https://faucet.circle.com",
  };
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function gatewayBalance(address: string): Promise<unknown> {
  const response = await fetch(`${GATEWAY_API}/v1/balances`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      token: "USDC",
      sources: [{ domain: ARC_DOMAIN, depositor: address }],
    }),
  });
  return parseJson(response);
}

async function probe(url: string, body: string) {
  const headers = { "Content-Type": "application/json" };
  const post = await fetch(url, { method: "POST", headers, body });
  if (post.status === 402 || post.status !== 405) {
    return { response: post, method: "POST" as const };
  }
  const get = await fetch(url, { method: "GET" });
  return { response: get, method: "GET" as const };
}

async function signAuthorization(options: {
  wallet: Wallet;
  accept: Record<string, unknown>;
}): Promise<{
  authorization: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
  signature: string;
  payTo: string;
  amount: string;
}> {
  const extra =
    options.accept.extra && typeof options.accept.extra === "object"
      ? (options.accept.extra as Record<string, unknown>)
      : {};
  const payTo =
    typeof options.accept.payTo === "string" ? options.accept.payTo : "";
  const amount =
    (typeof options.accept.amount === "string" && options.accept.amount) ||
    (typeof options.accept.maxAmountRequired === "string" &&
      options.accept.maxAmountRequired) ||
    "";
  if (!(payTo && amount)) {
    throw new Error("402 accept is missing payTo or amount");
  }
  const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}`;
  const authorization = {
    from: options.wallet.address,
    to: payTo,
    value: amount,
    validAfter: "0",
    validBefore: String(Math.floor(Date.now() / 1000) + VALIDITY_SECONDS),
    nonce,
  };
  const signature = await options.wallet.signTypedData(
    {
      name:
        (typeof extra.name === "string" && extra.name) ||
        "GatewayWalletBatched",
      version: (typeof extra.version === "string" && extra.version) || "1",
      chainId: ARC_CHAIN_ID,
      verifyingContract:
        (typeof extra.verifyingContract === "string" &&
          extra.verifyingContract) ||
        GATEWAY_WALLET,
    },
    {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    authorization
  );
  return { authorization, signature, payTo, amount };
}

function paymentHeader(options: {
  url: string;
  challenge: Record<string, unknown> | null;
  accept: Record<string, unknown>;
  signature: string;
  authorization: Record<string, string>;
}): string {
  const resourceFromChallenge = options.challenge?.resource;
  const payload = {
    x402Version: 2,
    resource:
      resourceFromChallenge && typeof resourceFromChallenge === "object"
        ? resourceFromChallenge
        : {
            url: options.url,
            description: "Graphitti listed workflow",
            mimeType: "application/json",
          },
    accepted: options.accept,
    payload: {
      signature: options.signature,
      authorization: options.authorization,
    },
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

async function retryPaid(options: {
  url: string;
  method: "GET" | "POST";
  requestBody: string;
  signatureHeader: string;
}) {
  const headers: Record<string, string> = {
    "PAYMENT-SIGNATURE": options.signatureHeader,
  };
  if (options.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }
  const paid = await fetch(options.url, {
    method: options.method,
    headers,
    body: options.method === "GET" ? undefined : options.requestBody,
  });
  const paidBody = await parseJson(paid);
  const paymentResponse = decodePaymentHeader(
    paid.headers.get("PAYMENT-RESPONSE")
  );
  return { paid, paidBody, paymentResponse };
}

function summarizePayment(options: {
  paid: Response;
  paidBody: unknown;
  paymentResponse: Record<string, unknown> | null;
  nonce: string;
}): {
  transaction: string;
  paymentId: string;
  executionId: unknown;
  ok: boolean;
} {
  const paidRecord =
    options.paidBody && typeof options.paidBody === "object"
      ? (options.paidBody as Record<string, unknown>)
      : {};
  const transaction =
    (options.paymentResponse &&
      typeof options.paymentResponse.transaction === "string" &&
      options.paymentResponse.transaction) ||
    (typeof paidRecord.transaction === "string" && paidRecord.transaction) ||
    "";
  const executionId = paidRecord.executionId ?? null;
  return {
    transaction,
    executionId,
    paymentId:
      transaction ||
      (typeof executionId === "string" && executionId) ||
      options.nonce,
    ok:
      options.paid.status === 200 &&
      Boolean(options.paymentResponse || executionId),
  };
}

function failIfNot402(options: {
  status: number;
  url: string;
  payer: string;
  balances: unknown;
  body: unknown;
}): void {
  if (options.status === 402) {
    return;
  }
  printJson({
    ok: false,
    error:
      options.status === 200
        ? "Endpoint did not require payment (free listing, catalog GET, or not the /call URL)."
        : `Unexpected HTTP ${options.status}`,
    httpStatus: options.status,
    url: options.url,
    payer: options.payer,
    load: loadHint(options.payer),
    gatewayBalance: options.balances,
    body: options.body,
  });
  process.exit(options.status === 200 ? 2 : 1);
}

async function main() {
  loadEnv();
  const url = listingUrl();
  const requestBody = argValue("--body") || "{}";
  const privateKey = process.env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error(
      "Set PRIVATE_KEY to the Arc Testnet EOA that deposited USDC into Gateway Wallet."
    );
  }

  const wallet = new Wallet(privateKey);
  const balances = await gatewayBalance(wallet.address);
  const first = await probe(url, requestBody);
  const firstBody = await parseJson(first.response);
  failIfNot402({
    status: first.response.status,
    url,
    payer: wallet.address,
    balances,
    body: firstBody,
  });

  const challenge = decodePaymentHeader(
    first.response.headers.get("PAYMENT-REQUIRED")
  );
  const accept = pickAccept(challenge, firstBody);
  if (!accept) {
    throw new Error("402 response did not include payment requirements");
  }
  const signed = await signAuthorization({ wallet, accept });
  const { paid, paidBody, paymentResponse } = await retryPaid({
    url,
    method: first.method,
    requestBody,
    signatureHeader: paymentHeader({
      url,
      challenge,
      accept,
      signature: signed.signature,
      authorization: signed.authorization,
    }),
  });
  const summary = summarizePayment({
    paid,
    paidBody,
    paymentResponse,
    nonce: signed.authorization.nonce,
  });
  printJson({
    ok: summary.ok,
    httpStatus: paid.status,
    url,
    payer: wallet.address,
    payTo: signed.payTo,
    amountAtomicUsdc: signed.amount,
    network: "eip155:5042002",
    transaction: summary.transaction,
    paymentId: summary.paymentId,
    nonce: signed.authorization.nonce,
    executionId: summary.executionId,
    paymentResponse,
    gatewayBalance: balances,
    load: loadHint(wallet.address),
    body: paidBody,
  });
  if (!summary.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
