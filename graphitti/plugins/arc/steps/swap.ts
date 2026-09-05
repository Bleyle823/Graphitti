import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ArcCredentials } from "../credentials";
import { getCircleSwapQuote, requireCircleKey } from "../shared";

export type SwapInput = StepInput & {
  integrationId?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
  quoteId?: string;
  transactionHash?: string;
  bridgeAfter?: string;
  destinationNetwork?: string;
};

async function creds(input: SwapInput): Promise<ArcCredentials> {
  return input.integrationId ? await fetchCredentials(input.integrationId) : {};
}

function allowedToken(symbol: string) {
  return symbol === "USDC" || symbol === "EURC" || symbol === "cirBTC";
}

async function swapOnArc(input: SwapInput) {
  if (!input.fromToken || !input.toToken || !input.amount) {
    return fail("fromToken, toToken, and amount are required");
  }
  if (!allowedToken(input.fromToken) || !allowedToken(input.toToken)) {
    return fail("Arc testnet swaps support USDC, EURC, and cirBTC only");
  }
  const key = requireCircleKey(await creds(input));
  if (!key.success) {
    return key;
  }
  try {
    const quote = await getCircleSwapQuote({
      apiKey: key.apiKey,
      fromToken: input.fromToken,
      toToken: input.toToken,
      amount: input.amount,
    });
    if (quote.error) {
      return fail(quote.error);
    }
    return ok({
      quote: quote.data,
      fromToken: input.fromToken,
      toToken: input.toToken,
      amount: input.amount,
      note: "Quote returned. Submit on Arc with the linked wallet if the quote includes calldata.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function swapAndBridge(input: SwapInput) {
  const quote = await swapOnArc(input);
  if (!quote.success) {
    return quote;
  }
  return ok({
    ...quote.data,
    next: "Run Bridge USDC with the swap output as the source amount",
    destinationNetwork: input.destinationNetwork || "ethereum",
  });
}

async function getSwapStatus(input: SwapInput) {
  if (!input.quoteId && !input.transactionHash) {
    return fail("quoteId or transactionHash is required");
  }
  const key = requireCircleKey(await creds(input));
  if (!key.success) {
    return key;
  }
  const path = input.quoteId
    ? `/v1/exchange/quotes/${encodeURIComponent(input.quoteId)}`
    : `/v1/exchange/swaps?transactionHash=${encodeURIComponent(input.transactionHash || "")}`;
  const { circleFetch, CIRCLE_API } = await import("@/lib/circle/client");
  const result = await circleFetch({
    baseUrl: CIRCLE_API,
    path,
    apiKey: key.apiKey,
  });
  if (result.error) {
    return fail(result.error);
  }
  return ok(result.data);
}

async function estimateSwap(input: SwapInput) {
  if (!input.fromToken || !input.toToken || !input.amount) {
    return fail("fromToken, toToken, and amount are required");
  }
  return ok({
    fromToken: input.fromToken,
    toToken: input.toToken,
    amount: input.amount,
    network: "arc-testnet",
    note: "Estimate only. Use Swap on Arc for a live Circle quote.",
  });
}

export async function swapOnArcStep(input: SwapInput) {
  "use step";
  return withStepLogging(input, () => swapOnArc(input));
}

export async function swapAndBridgeStep(input: SwapInput) {
  "use step";
  return withStepLogging(input, () => swapAndBridge(input));
}

export async function getSwapStatusStep(input: SwapInput) {
  "use step";
  return withStepLogging(input, () => getSwapStatus(input));
}

export async function estimateSwapStep(input: SwapInput) {
  "use step";
  return withStepLogging(input, () => estimateSwap(input));
}

export const _integrationType = "arc";
