import "server-only";

import { CIRCLE_API, circleFetch } from "@/lib/circle/client";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ArcCredentials } from "../credentials";
import { circleResult, requireStableFxKey } from "../shared";

export type StableFxInput = StepInput & {
  integrationId?: string;
  fromCurrency?: string;
  toCurrency?: string;
  amount?: string;
  quoteId?: string;
  tradeId?: string;
};

async function creds(input: StableFxInput): Promise<ArcCredentials> {
  return input.integrationId ? await fetchCredentials(input.integrationId) : {};
}

async function fxApi<T>(
  credentials: ArcCredentials,
  path: string,
  method?: string,
  body?: unknown
) {
  const key = requireStableFxKey(credentials);
  if (!key.success) {
    return key;
  }
  return circleResult(
    await circleFetch<T>({
      baseUrl: CIRCLE_API,
      path,
      apiKey: key.apiKey,
      method,
      body,
    })
  );
}

async function quote(input: StableFxInput) {
  if (!input.fromCurrency || !input.toCurrency || !input.amount) {
    return fail("fromCurrency, toCurrency, and amount are required");
  }
  return fxApi(await creds(input), "/v1/exchange/stablefx/quotes", "POST", {
    from: { currency: input.fromCurrency, amount: input.amount },
    to: { currency: input.toCurrency },
  });
}

async function execute(input: StableFxInput) {
  if (!input.quoteId) {
    return fail("quoteId is required");
  }
  return fxApi(await creds(input), "/v1/exchange/stablefx/trades", "POST", {
    quoteId: input.quoteId,
  });
}

async function status(input: StableFxInput) {
  if (!input.tradeId) {
    return fail("tradeId is required");
  }
  return fxApi(
    await creds(input),
    `/v1/exchange/stablefx/trades/${encodeURIComponent(input.tradeId)}`
  );
}

export async function stablefxQuoteStep(input: StableFxInput) {
  "use step";
  return withStepLogging(input, () => quote(input));
}

export async function stablefxExecuteStep(input: StableFxInput) {
  "use step";
  return withStepLogging(input, () => execute(input));
}

export async function stablefxStatusStep(input: StableFxInput) {
  "use step";
  return withStepLogging(input, () => status(input));
}

export const _integrationType = "arc";
