import "server-only";

import { circleFetch } from "@/lib/circle/client";
import { CIRCLE_GATEWAY_X402_BASE } from "./constants";
import type { X402Accepts } from "./x402";
import { decodeX402Header } from "./x402";

type SettleResponse = {
  success?: boolean;
  errorReason?: string;
  payer?: string;
  transaction?: string;
  network?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toPaymentPayload(decoded: unknown): Record<string, unknown> | null {
  const record = asRecord(decoded);
  if (!record) {
    return null;
  }
  if (record.payload || record.accepted || record.x402Version) {
    return record;
  }
  if (record.authorization && typeof record.authorization === "object") {
    return {
      x402Version: 2,
      payload: record,
    };
  }
  if (record.from && record.to && record.value && record.signature) {
    const { signature, ...authorization } = record;
    return {
      x402Version: 2,
      payload: { signature, authorization },
    };
  }
  return null;
}

function requirementsForSettle(options: {
  requirements: X402Accepts;
}): Record<string, unknown> {
  return {
    scheme: options.requirements.scheme,
    network: options.requirements.network,
    asset: options.requirements.asset,
    amount: options.requirements.amount,
    payTo: options.requirements.payTo,
    maxTimeoutSeconds: options.requirements.maxTimeoutSeconds,
    extra: options.requirements.extra,
  };
}

export async function verifyMarketplacePayment(options: {
  paymentHeader: string;
  requirements: X402Accepts;
}): Promise<{
  valid: boolean;
  txHash?: string;
  payer?: string;
  receipt: unknown;
}> {
  const decoded = decodeX402Header(options.paymentHeader);
  const paymentPayload = toPaymentPayload(decoded);
  if (!paymentPayload) {
    return { valid: false, receipt: decoded };
  }

  const accepted = asRecord(paymentPayload.accepted);
  const requirements =
    accepted && typeof accepted.network === "string"
      ? {
          ...requirementsForSettle(options),
          network: accepted.network,
          ...(typeof accepted.asset === "string"
            ? { asset: accepted.asset }
            : {}),
          ...(typeof accepted.payTo === "string"
            ? { payTo: accepted.payTo }
            : {}),
        }
      : requirementsForSettle(options);

  const apiKey = process.env.CIRCLE_API_KEY?.trim();
  const result = await circleFetch<SettleResponse>({
    baseUrl: CIRCLE_GATEWAY_X402_BASE,
    path: "/v1/x402/settle",
    method: "POST",
    apiKey,
    body: {
      paymentPayload,
      paymentRequirements: requirements,
    },
  });

  const settled = result.data;
  if (result.error || !settled?.success) {
    return { valid: false, receipt: settled ?? decoded };
  }

  return {
    valid: true,
    txHash: settled.transaction,
    payer: settled.payer,
    receipt: {
      ...paymentPayload,
      payer: settled.payer,
      transaction: settled.transaction,
      network: settled.network,
    },
  };
}
