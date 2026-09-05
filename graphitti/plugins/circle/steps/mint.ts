import "server-only";

import { CIRCLE_MINT_SANDBOX, circleFetch } from "@/lib/circle/client";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { circleResult, requireMintKey } from "../shared";
import type { CircleCredentials } from "../credentials";

export type MintInput = StepInput & {
  integrationId?: string;
  transferId?: string;
  paymentIntentId?: string;
  paymentId?: string;
  payoutId?: string;
  amount?: string;
  currency?: string;
  destinationAddress?: string;
  chain?: string;
  idempotencyKey?: string;
  destinationType?: string;
  confirmDestructive?: string;
  pageSize?: string;
};

async function creds(input: MintInput): Promise<CircleCredentials> {
  return input.integrationId ? await fetchCredentials(input.integrationId) : {};
}

async function mintApi<T>(
  credentials: CircleCredentials,
  path: string,
  method?: string,
  body?: unknown
) {
  const key = requireMintKey(credentials);
  if (!key.success) {
    return key;
  }
  return circleResult(
    await circleFetch<T>({
      baseUrl: CIRCLE_MINT_SANDBOX,
      path,
      apiKey: key.apiKey,
      method,
      body,
    })
  );
}

async function ping(input: MintInput) {
  return mintApi(await creds(input), "/v1/configuration");
}

async function getBalances(input: MintInput) {
  return mintApi(await creds(input), "/v1/balances");
}

async function createTransfer(input: MintInput) {
  if (!input.amount || !input.destinationAddress) {
    return fail("amount and destinationAddress are required");
  }
  return mintApi(await creds(input), "/v1/transfers", "POST", {
    idempotencyKey: input.idempotencyKey,
    destination: {
      type: "blockchain",
      address: input.destinationAddress,
      chain: input.chain || "ETH",
    },
    amount: {
      amount: input.amount,
      currency: input.currency || "USD",
    },
  });
}

async function getTransfer(input: MintInput) {
  if (!input.transferId) {
    return fail("transferId is required");
  }
  return mintApi(
    await creds(input),
    `/v1/transfers/${encodeURIComponent(input.transferId)}`
  );
}

async function listTransfers(input: MintInput) {
  const params = new URLSearchParams();
  if (input.pageSize) {
    params.set("pageSize", input.pageSize);
  }
  const query = params.toString();
  return mintApi(await creds(input), `/v1/transfers${query ? `?${query}` : ""}`);
}

async function createPaymentIntent(input: MintInput) {
  if (!input.amount) {
    return fail("amount is required");
  }
  return mintApi(await creds(input), "/v1/paymentIntents", "POST", {
    idempotencyKey: input.idempotencyKey,
    amount: {
      amount: input.amount,
      currency: input.currency || "USD",
    },
    settlementCurrency: input.currency || "USD",
  });
}

async function getPaymentIntent(input: MintInput) {
  if (!input.paymentIntentId) {
    return fail("paymentIntentId is required");
  }
  return mintApi(
    await creds(input),
    `/v1/paymentIntents/${encodeURIComponent(input.paymentIntentId)}`
  );
}

async function listPayments(input: MintInput) {
  const params = new URLSearchParams();
  if (input.pageSize) {
    params.set("pageSize", input.pageSize);
  }
  const query = params.toString();
  return mintApi(await creds(input), `/v1/payments${query ? `?${query}` : ""}`);
}

async function createPayout(input: MintInput) {
  if (!input.amount) {
    return fail("amount is required");
  }
  const destType = (input.destinationType || "blockchain").toLowerCase();
  if (
    (destType === "wire" || destType === "bank") &&
    input.confirmDestructive !== "yes"
  ) {
    return fail(
      'Wire/bank payouts redeem to fiat. Set confirmDestructive to "yes" to continue.'
    );
  }
  if (destType === "blockchain" && !input.destinationAddress) {
    return fail("destinationAddress is required for blockchain payouts");
  }
  return mintApi(await creds(input), "/v1/payouts", "POST", {
    idempotencyKey: input.idempotencyKey,
    destination: {
      type: destType === "bank" ? "wire" : destType,
      address: input.destinationAddress,
      chain: input.chain,
    },
    amount: {
      amount: input.amount,
      currency: input.currency || "USD",
    },
  });
}

async function getPayout(input: MintInput) {
  if (!input.payoutId) {
    return fail("payoutId is required");
  }
  return mintApi(
    await creds(input),
    `/v1/payouts/${encodeURIComponent(input.payoutId)}`
  );
}

export async function mintPingStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => ping(input));
}

export async function mintGetBalancesStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => getBalances(input));
}

export async function mintCreateTransferStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => createTransfer(input));
}

export async function mintGetTransferStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => getTransfer(input));
}

export async function mintListTransfersStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => listTransfers(input));
}

export async function mintCreatePaymentIntentStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => createPaymentIntent(input));
}

export async function mintGetPaymentIntentStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => getPaymentIntent(input));
}

export async function mintListPaymentsStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => listPayments(input));
}

export async function mintCreatePayoutStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => createPayout(input));
}

export async function mintGetPayoutStep(input: MintInput) {
  "use step";
  return withStepLogging(input, () => getPayout(input));
}

export const _integrationType = "circle";
