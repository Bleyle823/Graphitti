import { requireGatewayKey } from "./credentials.js";
import { graphQlPost, resolveGatewayUrl } from "./gateway.js";
import { fail, ok } from "./http.js";
import {
  aliasNetwork,
  asRecordArray,
  asString,
  EXAMPLE_QUERY,
  GRAPH_NETWORK_SUBGRAPH_ID,
  graphqlErrorMessage,
  isRecord,
  postNetworkSubgraph,
  queryUrlsForId,
  strParam,
} from "./shared.js";
import type { ExecuteParams, GraphCredentials, ToolResult } from "./types.js";

const SEARCH_QUERY = `
query SearchSubgraphs($keyword: String!, $first: Int!) {
  subgraphMetadataSearch(text: $keyword, first: $first) {
    displayName
    description
    categories
    subgraphs {
      id
      currentSignalledTokens
      currentVersion {
        subgraphDeployment {
          id
          ipfsHash
          queryFeesAmount
          manifest { network }
        }
      }
    }
  }
}
`;

const SEARCH_FALLBACK_QUERY = `
query SearchSubgraphsFallback($keyword: String!, $first: Int!) {
  subgraphs(
    first: $first
    orderBy: currentSignalledTokens
    orderDirection: desc
    where: { metadata_: { displayName_contains_nocase: $keyword }, active: true }
  ) {
    id
    currentSignalledTokens
    metadata { displayName description categories }
    currentVersion {
      subgraphDeployment {
        id
        ipfsHash
        queryFeesAmount
        manifest { network }
      }
    }
  }
}
`;

const QUERY_COUNTS_QUERY = `
query QueryCounts($hashes: [String!]!) {
  subgraphDeployments(where: { ipfsHash_in: $hashes }) {
    id
    ipfsHash
    queryFeesAmount
    subgraph { id metadata { displayName } }
  }
}
`;

const DETAIL_QUERY = `
query GetSubgraph($id: ID!) {
  subgraph(id: $id) {
    id
    metadata { displayName description categories }
    currentVersion {
      version
      subgraphDeployment {
        id
        ipfsHash
        queryFeesAmount
        manifest { network poweredBySubstreams startBlock }
      }
    }
  }
}
`;

const SCHEMA_QUERY = `{
  __schema {
    types {
      name
      kind
      fields { name }
    }
  }
}`;

type MappedSubgraph = Record<string, unknown>;

function mapSubgraph(raw: Record<string, unknown>, extras?: Record<string, unknown>): MappedSubgraph | undefined {
  const id = asString(raw.id);
  if (!id) {
    return undefined;
  }
  const currentVersion = isRecord(raw.currentVersion) ? raw.currentVersion : undefined;
  const deployment = isRecord(currentVersion?.subgraphDeployment)
    ? currentVersion.subgraphDeployment
    : undefined;
  const manifest = isRecord(deployment?.manifest) ? deployment.manifest : undefined;
  const metadata = isRecord(raw.metadata) ? raw.metadata : undefined;
  const queryFeesAmount = asString(deployment?.queryFeesAmount);
  const urls = queryUrlsForId(id);
  return {
    id,
    deployment_id: asString(deployment?.id),
    ipfs_hash: asString(deployment?.ipfsHash),
    network: asString(manifest?.network),
    display_name: extras?.displayName ?? asString(metadata?.displayName),
    description: extras?.description ?? asString(metadata?.description),
    query_fees_amount: queryFeesAmount,
    total_query_count: queryFeesAmount ?? "0",
    example_query: EXAMPLE_QUERY,
    ...urls,
  };
}

function mapSearchHits(data: unknown, network?: string): MappedSubgraph[] {
  const root = isRecord(data) ? data : {};
  const hits = asRecordArray(root.subgraphMetadataSearch);
  const results: MappedSubgraph[] = [];

  for (const hit of hits) {
    for (const subgraph of asRecordArray(hit.subgraphs)) {
      const mapped = mapSubgraph(subgraph, {
        displayName: asString(hit.displayName),
        description: asString(hit.description),
      });
      if (!mapped) {
        continue;
      }
      if (network && mapped.network && mapped.network !== network) {
        continue;
      }
      results.push(mapped);
    }
  }

  if (results.length > 0) {
    return results;
  }

  return asRecordArray(root.subgraphs)
    .map((item) => mapSubgraph(item))
    .filter((item): item is MappedSubgraph => item !== undefined)
    .filter((item) => !network || !item.network || item.network === network);
}

async function searchNetwork(apiKey: string, keyword: string, network?: string) {
  const first = 20;
  const primary = await postNetworkSubgraph({
    apiKey,
    query: SEARCH_QUERY,
    variables: { keyword, first },
  });

  if (!graphqlErrorMessage(primary.errors) && primary.data) {
    return { result: primary, items: mapSearchHits(primary.data, network) };
  }

  const fallback = await postNetworkSubgraph({
    apiKey,
    query: SEARCH_FALLBACK_QUERY,
    variables: { keyword, first },
  });
  return { result: fallback, items: mapSearchHits(fallback.data, network) };
}

function networkMetaUrls() {
  return queryUrlsForId(GRAPH_NETWORK_SUBGRAPH_ID);
}

export async function graphSearchSubgraphs(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const keyword = strParam(params, "keyword");
  if (!keyword) {
    return fail("keyword is required");
  }
  const network = aliasNetwork(strParam(params, "network"));
  const { result, items } = await searchNetwork(apiKey, keyword, network);
  const error = graphqlErrorMessage(result.errors);
  if (error && items.length === 0) {
    return fail(error);
  }
  const urls = networkMetaUrls();
  return ok({
    subgraphs: items,
    count: items.length,
    network: network ?? null,
    ...urls,
    http_status: result.httpStatus,
  });
}

export async function graphGetQueryCounts(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const raw = params.ipfs_hashes ?? params.ipfsHashes;
  const hashes = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string" && item.length > 0)
    : typeof raw === "string"
      ? [raw]
      : [];
  if (hashes.length === 0) {
    return fail("ipfs_hashes array is required");
  }

  const result = await postNetworkSubgraph({
    apiKey,
    query: QUERY_COUNTS_QUERY,
    variables: { hashes },
  });
  const error = graphqlErrorMessage(result.errors);
  if (error) {
    return fail(error);
  }
  const root = isRecord(result.data) ? result.data : {};
  const deployments = asRecordArray(root.subgraphDeployments).map((dep) => ({
    deployment_id: asString(dep.id),
    ipfs_hash: asString(dep.ipfsHash),
    total_query_count: asString(dep.queryFeesAmount) ?? "0",
    subgraph_id: isRecord(dep.subgraph) ? asString(dep.subgraph.id) : undefined,
    display_name: isRecord(dep.subgraph) && isRecord(dep.subgraph.metadata)
      ? asString(dep.subgraph.metadata.displayName)
      : undefined,
  }));

  return ok({
    counts: deployments,
    count: deployments.length,
    ...networkMetaUrls(),
    http_status: result.httpStatus,
  });
}

async function attachQueryCounts(
  apiKey: string,
  items: MappedSubgraph[]
): Promise<MappedSubgraph[]> {
  const hashes = items
    .map((item) => asString(item.ipfs_hash))
    .filter((hash): hash is string => Boolean(hash));
  if (hashes.length === 0) {
    return items;
  }
  const countsResult = await graphGetQueryCounts({ ipfs_hashes: hashes }, {
    THEGRAPH_API_KEY: apiKey,
  });
  if (!countsResult.success) {
    return items.map((item) => ({
      ...item,
      total_query_count: item.query_fees_amount ?? "0",
    }));
  }
  const byHash = new Map<string, string>();
  for (const row of asRecordArray(countsResult.data.counts)) {
    const hash = asString(row.ipfs_hash);
    if (hash) {
      byHash.set(hash, asString(row.total_query_count) ?? "0");
    }
  }
  return items
    .map((item) => {
      const hash = asString(item.ipfs_hash);
      return {
        ...item,
        total_query_count: hash ? (byHash.get(hash) ?? item.query_fees_amount ?? "0") : "0",
      };
    })
    .sort(
      (a, b) =>
        Number(b.total_query_count ?? 0) - Number(a.total_query_count ?? 0)
    );
}

export async function graphRecommendSubgraph(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const goal = strParam(params, "goal");
  if (!goal) {
    return fail("goal is required");
  }
  const network = aliasNetwork(strParam(params, "network"));
  const { result, items } = await searchNetwork(apiKey, goal, network);
  const error = graphqlErrorMessage(result.errors);
  if (error && items.length === 0) {
    return fail(error);
  }
  const ranked = await attachQueryCounts(apiKey, items.slice(0, 10));
  const urls = networkMetaUrls();
  return ok({
    goal,
    network: network ?? null,
    subgraphs: ranked,
    count: ranked.length,
    volume_check_note:
      "Candidates include 30-day query counts (queryFeesAmount). Prefer the highest total_query_count.",
    ...urls,
    http_status: result.httpStatus,
  });
}

export async function graphGetSubgraphDetail(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const id = strParam(params, "subgraph_id") ?? strParam(params, "id");
  if (!id) {
    return fail("subgraph_id is required");
  }
  const result = await postNetworkSubgraph({
    apiKey,
    query: DETAIL_QUERY,
    variables: { id },
  });
  const error = graphqlErrorMessage(result.errors);
  if (error) {
    return fail(error);
  }
  const root = isRecord(result.data) ? result.data : {};
  const raw = isRecord(root.subgraph) ? root.subgraph : undefined;
  if (!raw) {
    return fail(`Subgraph ${id} was not found.`);
  }
  const mapped = mapSubgraph(raw);
  if (!mapped) {
    return fail(`Subgraph ${id} could not be mapped.`);
  }
  return ok({ ...mapped, http_status: result.httpStatus });
}

export async function graphGetSchema(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const resolved = resolveGatewayUrl({
    id: strParam(params, "subgraph_id") ?? strParam(params, "id"),
    deploymentId: strParam(params, "deployment_id") ?? strParam(params, "deploymentId"),
    ipfsHash: strParam(params, "ipfs_hash") ?? strParam(params, "ipfsHash"),
  });
  if ("error" in resolved) {
    return fail(resolved.error);
  }
  const result = await graphQlPost({
    url: resolved.queryUrl,
    apiKey,
    query: SCHEMA_QUERY,
  });
  const error = graphqlErrorMessage(result.errors);
  if (error) {
    return fail(error);
  }
  const root = isRecord(result.data) ? result.data : {};
  const schema = isRecord(root.__schema) ? root.__schema : {};
  const types = asRecordArray(schema.types)
    .filter((item) => item.kind === "OBJECT")
    .filter((item) => {
      const name = asString(item.name) ?? "";
      return !name.startsWith("_");
    })
    .map((item) => ({
      name: asString(item.name),
      fields: asRecordArray(item.fields)
        .map((field) => asString(field.name))
        .filter((name): name is string => Boolean(name)),
    }));
  return ok({
    types,
    count: types.length,
    query_url: resolved.queryUrl,
    query_url_x402: resolved.x402Url,
    http_status: result.httpStatus,
  });
}

export async function graphFindByContract(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const contract = strParam(params, "contract_address") ?? strParam(params, "contract");
  if (!contract) {
    return fail("contract_address is required");
  }
  const chain = aliasNetwork(strParam(params, "chain") ?? strParam(params, "network"));
  const { result, items } = await searchNetwork(apiKey, contract, chain);
  const error = graphqlErrorMessage(result.errors);
  if (error && items.length === 0) {
    return fail(error);
  }
  const ranked = await attachQueryCounts(apiKey, items.slice(0, 3));
  const urls = networkMetaUrls();
  return ok({
    contract_address: contract,
    chain: chain ?? null,
    subgraphs: ranked,
    count: ranked.length,
    ...urls,
    http_status: result.httpStatus,
  });
}
