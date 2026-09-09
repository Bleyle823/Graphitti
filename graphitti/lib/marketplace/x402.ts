import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflowPayments } from "@/lib/db/schema";
import { toCaip2 } from "@/lib/web3/chains";
import {
  ARC_MARKETPLACE_ASSET,
  ARC_MARKETPLACE_CHAIN,
  priceToAtomicUsdc,
} from "./constants";

export type X402Accepts = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  asset: string;
  payTo: string;
  resource: string;
  extra?: Record<string, string>;
};

export function buildArcPaymentRequired(options: {
  priceUsdc: string;
  payTo: string;
  resource: string;
}): { accepts: X402Accepts[] } {
  return {
    accepts: [
      {
        scheme: "exact",
        network: toCaip2(ARC_MARKETPLACE_CHAIN),
        maxAmountRequired: priceToAtomicUsdc(options.priceUsdc),
        asset: ARC_MARKETPLACE_ASSET,
        payTo: options.payTo,
        resource: options.resource,
        extra: { paymentProtocol: "arc-x402" },
      },
    ],
  };
}

/** Circle Gateway EIP-3009 nanopayment challenge for the same listing. */
export function buildCircleNanopayRequired(options: {
  priceUsdc: string;
  payTo: string;
  resource: string;
}): { accepts: X402Accepts[] } {
  return {
    accepts: [
      {
        scheme: "exact",
        network: toCaip2(ARC_MARKETPLACE_CHAIN),
        maxAmountRequired: priceToAtomicUsdc(options.priceUsdc),
        asset: ARC_MARKETPLACE_ASSET,
        payTo: options.payTo,
        resource: options.resource,
        extra: {
          paymentProtocol: "circle-nanopay",
          settleUrl: "https://gateway-api-testnet.circle.com/v1/transfer",
        },
      },
    ],
  };
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
