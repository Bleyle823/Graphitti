import { fail } from "@/lib/http-json";
import { kelpSubgraphManifestFallback } from "@/lib/the-graph/kelp-substreams-deployments";
import { getErrorMessage } from "@/lib/utils";
import { graphQlPost, subgraphQueryUrl, subgraphX402Url } from "@/lib/the-graph/gateway";
import type { TheGraphCredentials } from "../credentials";
import { validateGatewayApiKey } from "../credentials";

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

export function requireGatewayKey(credentials: TheGraphCredentials) {
  const validated = validateGatewayApiKey(credentials.THEGRAPH_API_KEY);
  if (!validated.ok) {
    return fail(validated.error);
  }
  return validated.apiKey;
}

export function requireMarketBearer(credentials: TheGraphCredentials) {
  const bearer = credentials.THEGRAPH_MARKET_BEARER?.trim();
  if (!bearer) {
    return fail(
      "THEGRAPH_MARKET_BEARER is not configured. Please add your Market/Portal token in Project Integrations."
    );
  }
  return bearer;
}

export function graphqlErrorMessage(
  errors?: Array<{ message: string }>
): string | undefined {
  if (!errors?.length) {
    return undefined;
  }
  const message = errors.map((item) => item.message).join("; ");
  if (message.includes("malformed API key")) {
    return `${message}. Use the 32-character Studio key from thegraph.com/studio in Project Integrations → The Graph → Studio / Gateway API Key (not SUBSTREAMS_API_KEY).`;
  }
  return message;
}

export function parseVariablesJson(
  raw?: string
):
  | { ok: true; variables: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!raw?.trim()) {
    return { ok: true, variables: {} };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
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

const UNRESOLVED_SUBGRAPH_ID_PATTERNS = [
  /^YOUR_.*SUBGRAPH_ID$/i,
  /^YOUR_SUBGRAPH_ID$/i,
  /^subgraph_id_here$/i,
];

export function isUnresolvedSubgraphId(value: unknown): boolean {
  if (typeof value !== "string" || value.trim() === "") {
    return true;
  }
  const trimmed = value.trim();
  if (trimmed.includes("{{")) {
    return false;
  }
  return UNRESOLVED_SUBGRAPH_ID_PATTERNS.some((pattern) => pattern.test(trimmed));
}

const KELP_PACKAGE_SLUG = "kelp-rseth-backing-alerts";

const SUBGRAPH_BY_SLUG_QUERY = `
query SubgraphBySlug($keyword: String!, $first: Int!) {
  subgraphMetadataSearch(text: $keyword, first: $first) {
    displayName
    subgraphs {
      id
      currentVersion {
        subgraphDeployment {
          id
          ipfsHash
        }
      }
    }
  }
}
`;

export type ResolvedSubgraphIdentifiers = {
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
};

export async function lookupSubgraphByPackageSlug(
  slug: string,
  apiKey: string
): Promise<ResolvedSubgraphIdentifiers | null> {
  const result = await postNetworkSubgraph({
    apiKey,
    query: SUBGRAPH_BY_SLUG_QUERY,
    variables: { keyword: slug, first: 10 },
  });
  const gqlError = graphqlErrorMessage(result.errors);
  if (gqlError) {
    return null;
  }

  const searchResults = isRecord(result.data)
    ? asRecordArray(result.data.subgraphMetadataSearch)
    : [];
  const slugLower = slug.toLowerCase();

  for (const item of searchResults) {
    const displayName = asString(item.displayName)?.toLowerCase() ?? "";
    if (!displayName.includes(slugLower) && displayName !== slugLower) {
      continue;
    }
    const subgraphs = asRecordArray(item.subgraphs);
    const match = subgraphs[0];
    if (!match) {
      continue;
    }
    const deployment = isRecord(match.currentVersion)
      ? isRecord(match.currentVersion.subgraphDeployment)
        ? match.currentVersion.subgraphDeployment
        : null
      : null;
    return {
      id: asString(match.id),
      deploymentId: deployment ? asString(deployment.id) : undefined,
      ipfsHash: deployment ? asString(deployment.ipfsHash) : undefined,
    };
  }

  return null;
}

export function kelpSubgraphEnvFallback(): ResolvedSubgraphIdentifiers {
  return {
    id: process.env.KELP_SUBGRAPH_ID?.trim() || undefined,
    deploymentId: process.env.KELP_DEPLOYMENT_ID?.trim() || undefined,
    ipfsHash: process.env.KELP_IPFS_HASH?.trim() || undefined,
  };
}

export function graphStepError(context: string, error: unknown): string {
  return `${context}: ${getErrorMessage(error)}`;
}

export async function resolveSubgraphIdentifiers(input: {
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
  packageSlug?: string;
  apiKey: string;
}): Promise<
  | { ok: true; identifiers: ResolvedSubgraphIdentifiers }
  | { ok: false; error: string }
> {
  let id = input.id?.trim();
  let deploymentId = input.deploymentId?.trim();
  let ipfsHash = input.ipfsHash?.trim();

  if (id && isUnresolvedSubgraphId(id)) {
    id = undefined;
  }
  if (deploymentId && isUnresolvedSubgraphId(deploymentId)) {
    deploymentId = undefined;
  }
  if (ipfsHash && isUnresolvedSubgraphId(ipfsHash)) {
    ipfsHash = undefined;
  }

  if (id || deploymentId || ipfsHash) {
    return { ok: true, identifiers: { id, deploymentId, ipfsHash } };
  }

  const manifestFallback = kelpSubgraphManifestFallback();
  if (
    manifestFallback.id ||
    manifestFallback.deploymentId ||
    manifestFallback.ipfsHash
  ) {
    return { ok: true, identifiers: manifestFallback };
  }

  const envFallback = kelpSubgraphEnvFallback();
  if (envFallback.id || envFallback.deploymentId || envFallback.ipfsHash) {
    return { ok: true, identifiers: envFallback };
  }

  const slug = input.packageSlug?.trim() || KELP_PACKAGE_SLUG;
  const discovered = await lookupSubgraphByPackageSlug(slug, input.apiKey);
  if (discovered?.id || discovered?.deploymentId || discovered?.ipfsHash) {
    return { ok: true, identifiers: discovered };
  }

  return {
    ok: false,
    error: `Subgraph not deployed for "${slug}". Run pnpm substreams:deploy-kelp (writes substreams/deployments.json), or set KELP_SUBGRAPH_ID in .env.local.`,
  };
}
