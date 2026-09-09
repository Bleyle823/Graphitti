import { graphQlPost, subgraphQueryUrl, subgraphX402Url } from "./gateway.js";

export const GRAPH_NETWORK_SUBGRAPH_ID =
  "DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp";

export const EXAMPLE_QUERY = "{ _meta { block { number hash } } }";

export const NETWORK_ALIASES: Record<string, string> = {
  ethereum: "mainnet",
  eth: "mainnet",
  polygon: "matic",
  arbitrum: "arbitrum-one",
  arb: "arbitrum-one",
};

export function aliasNetwork(network?: string): string | undefined {
  if (!network?.trim()) {
    return undefined;
  }
  const trimmed = network.trim().toLowerCase();
  return NETWORK_ALIASES[trimmed] ?? trimmed;
}

export function graphqlErrorMessage(
  errors?: Array<{ message: string }>
): string | undefined {
  if (!errors?.length) {
    return undefined;
  }
  return errors.map((item) => item.message).join("; ");
}

export function queryUrlsForId(id: string) {
  return {
    query_url: subgraphQueryUrl(id),
    query_url_x402: subgraphX402Url(id),
  };
}

export async function postNetworkSubgraph(options: {
  apiKey: string;
  query: string;
  variables?: Record<string, unknown>;
}) {
  return graphQlPost({
    url: subgraphQueryUrl(GRAPH_NETWORK_SUBGRAPH_ID),
    apiKey: options.apiKey,
    query: options.query,
    variables: options.variables,
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

export function strParam(params: ExecuteParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value.trim() : undefined;
}

export function numParam(params: ExecuteParams, key: string): number | undefined {
  const value = params[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

import type { ExecuteParams } from "./types.js";

export function parseVariablesJson(raw?: string):
  | { ok: true; variables: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!raw?.trim()) {
    return { ok: true, variables: {} };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "variables must be a JSON object" };
    }
    return { ok: true, variables: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      error: `Invalid variables JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
