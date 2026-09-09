import { readJson } from "./http.js";

const REGISTRY = "https://substreams.dev/v1/registry/packages";

export const SUBSTREAMS_ENDPOINTS: Record<string, string> = {
  ethereum: "https://mainnet.eth.streamingfast.io:443",
  mainnet: "https://mainnet.eth.streamingfast.io:443",
  base: "https://base.streamingfast.io:443",
  arbitrum: "https://arb-one.streamingfast.io:443",
  optimism: "https://optimism.streamingfast.io:443",
  polygon: "https://polygon.streamingfast.io:443",
  solana: "https://mainnet.sol.streamingfast.io:443",
};

export async function searchSubstreamsPackages(options: {
  query?: string;
  organization?: string;
  featured?: string;
  page?: string;
  apiKey?: string;
}): Promise<unknown> {
  const url = new URL(REGISTRY);
  if (options.query) {
    url.searchParams.set("query", options.query);
  }
  if (options.organization) {
    url.searchParams.set("organization", options.organization);
  }
  if (options.featured) {
    url.searchParams.set("featured", options.featured);
  }
  if (options.page) {
    url.searchParams.set("page", options.page);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const response = await fetch(url.toString(), { headers });
  const body = await readJson<Record<string, unknown>>(response);
  if (!("packages" in body)) {
    return { ...body, packages: [] };
  }
  return body;
}

export function packageSpkgUrl(slug: string, version: string): string {
  return `https://spkg.io/v1/packages/${slug}/${version}`;
}

export function defaultEndpointForNetwork(network: string): string | undefined {
  return SUBSTREAMS_ENDPOINTS[network];
}

export const DEPLOY_CHECKLIST = [
  "substreams auth && substreams build",
  "substreams run ./substreams.yaml <map_module> -s <start> -t +100 -o jsonl",
  "Add graph_out module emitting EntityChanges",
  "Define schema.graphql matching entity fields",
  "graph deploy --studio <slug>",
  "Bind subgraph id to graph_query_substreams_entity",
  "Optional: substreams sink webhook to Graphitti workflow",
];
