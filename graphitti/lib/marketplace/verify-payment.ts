import "server-only";

import { circleFetch } from "@/lib/circle/client";
import {
  ARC_MARKETPLACE_ASSET,
  ARC_MARKETPLACE_CHAIN,
  priceToAtomicUsdc,
} from "./constants";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4dddf850b";

const ARC_RPC = ARC_MARKETPLACE_CHAIN.rpcUrl;

function normalizeAddress(value: string): string {
  return value.toLowerCase().replace(/^0x/, "");
}

function parsePaymentReceipt(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Plain signature or hash string
  }
  if (raw.startsWith("0x") && raw.length === 66) {
    return { txHash: raw };
  }
  return { signature: raw };
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(ARC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) {
    throw new Error(payload.error.message || "Arc RPC error");
  }
  return payload.result as T;
}

async function verifyArcUsdcTransfer(options: {
  txHash: string;
  payTo: string;
  minAtomic: bigint;
}): Promise<boolean> {
  const receipt = await rpcCall<{
    status?: string;
    logs?: Array<{ address?: string; topics?: string[]; data?: string }>;
  }>("eth_getTransactionReceipt", [options.txHash]);

  if (!receipt || receipt.status !== "0x1") {
    return false;
  }

  const payTo = normalizeAddress(options.payTo);
  const token = normalizeAddress(ARC_MARKETPLACE_ASSET);

  for (const log of receipt.logs ?? []) {
    if (!log.topics?.[0] || log.topics[0].toLowerCase() !== TRANSFER_TOPIC) {
      continue;
    }
    if (normalizeAddress(log.address ?? "") !== token) {
      continue;
    }
    const toTopic = log.topics[2];
    if (!toTopic) {
      continue;
    }
    const to = normalizeAddress(toTopic.slice(-40));
    if (to !== payTo) {
      continue;
    }
    const value = BigInt(log.data ?? "0x0");
    if (value >= options.minAtomic) {
      return true;
    }
  }

  return false;
}

async function settleCircleAuthorization(
  authorization: Record<string, unknown>
): Promise<{ ok: boolean; txHash?: string }> {
  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false };
  }

  const result = await circleFetch<{ data?: { hash?: string; txHash?: string } }>({
    baseUrl: "https://gateway-api-testnet.circle.com",
    path: "/v1/transfer",
    method: "POST",
    apiKey,
    body: authorization,
  });

  if (result.error) {
    return { ok: false };
  }

  const hash =
    result.data?.data?.hash ||
    result.data?.data?.txHash ||
    (result.data as { hash?: string })?.hash;

  return { ok: true, txHash: hash };
}

export async function verifyMarketplacePayment(options: {
  paymentHeader: string;
  payTo: string;
  priceUsdc: string;
}): Promise<{ valid: boolean; txHash?: string; receipt: unknown }> {
  const receipt = parsePaymentReceipt(options.paymentHeader);
  const minAtomic = BigInt(priceToAtomicUsdc(options.priceUsdc));

  const txHash =
    (typeof receipt.txHash === "string" && receipt.txHash) ||
    (typeof receipt.transactionHash === "string" && receipt.transactionHash) ||
    (typeof receipt.hash === "string" && receipt.hash);

  if (txHash) {
    const valid = await verifyArcUsdcTransfer({
      txHash,
      payTo: options.payTo,
      minAtomic,
    });
    return { valid, txHash, receipt };
  }

  if (
    receipt.from &&
    receipt.to &&
    receipt.value &&
    (receipt.signature || receipt.v)
  ) {
    const settled = await settleCircleAuthorization(receipt);
    if (settled.ok) {
      return { valid: true, txHash: settled.txHash, receipt };
    }
  }

  if (receipt.authorization && typeof receipt.authorization === "object") {
    const auth = receipt.authorization as Record<string, unknown>;
    const settled = await settleCircleAuthorization({
      ...auth,
      signature: receipt.signature ?? auth.signature,
    });
    if (settled.ok) {
      return { valid: true, txHash: settled.txHash, receipt };
    }
  }

  // Accept pre-settled Circle transfer nonce lookup when present.
  if (typeof receipt.nonce === "string") {
    const apiKey = process.env.CIRCLE_API_KEY?.trim();
    if (apiKey) {
      const lookup = await circleFetch<{ data?: { state?: string } }>({
        baseUrl: "https://gateway-api-testnet.circle.com",
        path: `/v1/transfers?nonce=${encodeURIComponent(receipt.nonce)}`,
        apiKey,
      });
      const state = (lookup.data as { data?: { state?: string } })?.data?.state;
      if (state === "COMPLETE" || state === "complete") {
        return { valid: true, receipt };
      }
    }
  }

  return { valid: false, receipt };
}
