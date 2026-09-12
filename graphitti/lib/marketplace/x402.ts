import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowPayments } from "@/lib/db/schema";
import { toCaip2 } from "@/lib/web3/chains";
import {
  ARC_MARKETPLACE_ASSET,
  ARC_MARKETPLACE_CHAIN,
  GATEWAY_WALLET_BATCHED_NAME,
  GATEWAY_WALLET_BATCHED_VERSION,
  MARKETPLACE_GATEWAY_WALLET,
  MARKETPLACE_X402_MAX_TIMEOUT_SECONDS,
  priceToAtomicUsdc,
} from "./constants";

export type X402Accepts = {
  scheme: "exact";
  network: string;
  amount: string;
  maxAmountRequired: string;
  asset: string;
  payTo: string;
  resource: string;
  maxTimeoutSeconds: number;
  extra: {
    name: string;
    version: string;
    verifyingContract: string;
  };
};

export type X402PaymentRequired = {
  x402Version: 2;
  resource: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepts: X402Accepts[];
};

export function buildCircleNanopayRequired(options: {
  priceUsdc: string;
  payTo: string;
  resource: string;
  description?: string;
}): X402PaymentRequired {
  const amount = priceToAtomicUsdc(options.priceUsdc);
  return {
    x402Version: 2,
    resource: {
      url: options.resource,
      description: options.description ?? "Graphitti listed workflow",
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: toCaip2(ARC_MARKETPLACE_CHAIN),
        amount,
        maxAmountRequired: amount,
        asset: ARC_MARKETPLACE_ASSET,
        payTo: options.payTo,
        resource: options.resource,
        maxTimeoutSeconds: MARKETPLACE_X402_MAX_TIMEOUT_SECONDS,
        extra: {
          name: GATEWAY_WALLET_BATCHED_NAME,
          version: GATEWAY_WALLET_BATCHED_VERSION,
          verifyingContract: MARKETPLACE_GATEWAY_WALLET,
        },
      },
    ],
  };
}

export function encodeX402Header(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export function decodeX402Header(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    const parsed = JSON.parse(decoded) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Not base64 JSON
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export function paymentHashFromReceipt(receipt: unknown): string {
  const raw =
    typeof receipt === "string" ? receipt : JSON.stringify(receipt ?? {});
  return createHash("sha256").update(raw).digest("hex");
}

export function extractTxHash(receipt: unknown): string | undefined {
  if (!receipt || typeof receipt !== "object") {
    return;
  }
  const rec = receipt as Record<string, unknown>;
  if (typeof rec.txHash === "string") {
    return rec.txHash;
  }
  if (typeof rec.transactionHash === "string") {
    return rec.transactionHash;
  }
  if (typeof rec.hash === "string") {
    return rec.hash;
  }
  if (typeof rec.transaction === "string") {
    return rec.transaction;
  }
  return;
}

export function extractPayer(receipt: unknown): string | undefined {
  if (!receipt || typeof receipt !== "object") {
    return;
  }
  const rec = receipt as Record<string, unknown>;
  if (typeof rec.payer === "string") {
    return rec.payer;
  }
  const payload = rec.payload;
  if (payload && typeof payload === "object") {
    const authorization = (payload as { authorization?: { from?: unknown } })
      .authorization;
    if (typeof authorization?.from === "string") {
      return authorization.from;
    }
  }
  return;
}

export async function recordWorkflowPayment(options: {
  workflowId: string;
  caller?: string;
  amountUsdc: string;
  paymentHash: string;
  txHash?: string;
}): Promise<{ created: boolean }> {
  const existing = await db.query.workflowPayments.findFirst({
    where: eq(workflowPayments.paymentHash, options.paymentHash),
  });
  if (existing) {
    return { created: false };
  }

  try {
    await db.insert(workflowPayments).values({
      workflowId: options.workflowId,
      caller: options.caller,
      amountUsdc: options.amountUsdc,
      paymentHash: options.paymentHash,
      txHash: options.txHash,
      chain: "arc-testnet",
    });
    return { created: true };
  } catch {
    return { created: false };
  }
}
