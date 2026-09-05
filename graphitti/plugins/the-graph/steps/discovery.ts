import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { graphQlPost, resolveGatewayUrl } from "@/lib/the-graph/gateway";
import type { TheGraphCredentials } from "../credentials";
import {
  EXAMPLE_QUERY,
  GRAPH_NETWORK_SUBGRAPH_ID,
  aliasNetwork,
  asRecordArray,
  asString,
  graphqlErrorMessage,
  isRecord,
  postNetworkSubgraph,
  queryUrlsForId,
  requireGatewayKey,
} from "./shared";

type DiscoveryInput = StepInput & {
  integrationId?: string;
  keyword?: string;
  network?: string;
  goal?: string;
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
  contract?: string;
  chain?: string;
};

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

const SEARCH_FALLBACK_WITH_NETWORK = `
query SearchSubgraphsByNetwork($keyword: String!, $network: String!, $first: Int!) {
  subgraphs(
    first: $first
    orderBy: currentSignalledTokens
    orderDirection: desc
    where: {
      metadata_: { displayName_contains_nocase: $keyword }
      active: true
      currentVersion_: { subgraphDeployment_: { manifest_: { network: $network } } }
    }
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

const DETAIL_QUERY = `
query GetSubgraph($id: ID!) {
  subgraph(id: $id) {
    id
    currentSignalledTokens
    metadata {
      displayName
      description
      categories
      website
      codeRepository
    }
    owner { id }
    currentVersion {
      version
      subgraphDeployment {
        id
        ipfsHash
        queryFeesAmount
        indexingRewardAmount
        stakedTokens
        manifest {
          network
          poweredBySubstreams
          startBlock
        }
      }
    }
  }
}
`;

const CONTRACT_SEARCH_QUERY = `
query FindByContract($keyword: String!, $first: Int!) {
  subgraphs(
    first: $first
    orderBy: currentSignalledTokens
    orderDirection: desc
    where: {
      or: [
        { metadata_: { displayName_contains_nocase: $keyword } }
        { metadata_: { description_contains_nocase: $keyword } }
      ]
      active: true
    }
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

const SCHEMA_QUERY = `{
  __schema {
    types {
      name
      kind
      fields { name }
    }
  }
}`;

type MappedSubgraph = {
  id: string;
  deploymentId?: string;
  ipfsHash?: string;
  network?: string;
  displayName?: string;
  description?: string;
  categories?: unknown;
  queryFeesAmount?: string;
  query_volume_30d?: string;
  example_query: string;
  query_url: string;
  query_url_x402: string;
};

function mapDeployment(raw: unknown) {
  if (!isRecord(raw)) {
    return {};
  }
  const manifest = isRecord(raw.manifest) ? raw.manifest : undefined;
  return {
    deploymentId: asString(raw.id),
    ipfsHash: asString(raw.ipfsHash),
    queryFeesAmount: asString(raw.queryFeesAmount),
    network: asString(manifest?.network),
  };
}

function mapSubgraph(
  raw: Record<string, unknown>,
  extras?: { displayName?: string; description?: string; categories?: unknown }
): MappedSubgraph | undefined {
  const id = asString(raw.id);
  if (!id) {
    return undefined;
  }
  const metadata = isRecord(raw.metadata) ? raw.metadata : undefined;
  const currentVersion = isRecord(raw.currentVersion)
    ? raw.currentVersion
    : undefined;
  const deployment = mapDeployment(currentVersion?.subgraphDeployment);
  const urls = queryUrlsForId(id);
  const queryFeesAmount = deployment.queryFeesAmount;
  return {
    id,
    deploymentId: deployment.deploymentId,
    ipfsHash: deployment.ipfsHash,
    network: deployment.network,
    displayName:
      extras?.displayName ?? asString(metadata?.displayName),
    description: extras?.description ?? asString(metadata?.description),
    categories: extras?.categories ?? metadata?.categories,
    queryFeesAmount,
    query_volume_30d: queryFeesAmount,
    example_query: EXAMPLE_QUERY,
    ...urls,
  };
}

function mapSearchHits(data: unknown, network?: string): MappedSubgraph[] {
  const root = isRecord(data) ? data : {};
  const hits = asRecordArray(root.subgraphMetadataSearch);
  const results: MappedSubgraph[] = [];

  for (const hit of hits) {
    const subgraphs = asRecordArray(hit.subgraphs);
    for (const subgraph of subgraphs) {
      const mapped = mapSubgraph(subgraph, {
        displayName: asString(hit.displayName),
        description: asString(hit.description),
        categories: hit.categories,
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

async function searchNetwork(
  apiKey: string,
  keyword: string,
  network?: string
) {
  const first = 20;
  const primary = await postNetworkSubgraph({
    apiKey,
    query: SEARCH_QUERY,
    variables: { keyword, first },
  });

  const primaryError = graphqlErrorMessage(primary.errors);
  if (!primaryError && primary.data) {
    return { result: primary, items: mapSearchHits(primary.data, network) };
  }

  const fallbackQuery = network
    ? SEARCH_FALLBACK_WITH_NETWORK
    : SEARCH_FALLBACK_QUERY;
  const fallbackVars: Record<string, unknown> = { keyword, first };
  if (network) {
    fallbackVars.network = network;
  }

  const fallback = await postNetworkSubgraph({
    apiKey,
    query: fallbackQuery,
    variables: fallbackVars,
  });
  return {
    result: fallback,
    items: mapSearchHits(fallback.data, network),
    searchError: primaryError,
  };
}

async function searchHandler(input: DiscoveryInput, credentials: TheGraphCredentials) {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return apiKey;
  }
  const keyword = input.keyword?.trim();
  if (!keyword) {
    return fail("keyword is required");
  }
  const network = aliasNetwork(input.network);

  try {
    const { result, items, searchError } = await searchNetwork(
      apiKey,
      keyword,
      network
    );
    const error = graphqlErrorMessage(result.errors);
    if (error && items.length === 0) {
      return fail(searchError ? `${searchError}; ${error}` : error);
    }
    return ok({
      subgraphs: items,
      count: items.length,
      network: network ?? null,
      query_url: subgraphQueryUrlSafe(),
      query_url_x402: subgraphX402Safe(),
      httpStatus: result.httpStatus,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function subgraphQueryUrlSafe() {
  return queryUrlsForId(GRAPH_NETWORK_SUBGRAPH_ID).query_url;
}

function subgraphX402Safe() {
  return queryUrlsForId(GRAPH_NETWORK_SUBGRAPH_ID).query_url_x402;
}

const GOAL_NETWORKS = [
  "mainnet",
  "ethereum",
  "base",
  "arbitrum",
  "optimism",
  "polygon",
  "matic",
] as const;

function parseGoal(goal: string): { keyword: string; network?: string } {
  const lower = goal.toLowerCase();
  const networkHit = GOAL_NETWORKS.find((name) =>
    new RegExp(`\\b${name}\\b`).test(lower)
  );
  return {
    keyword: goal.trim(),
    network: aliasNetwork(networkHit),
  };
}

async function recommendHandler(
  input: DiscoveryInput,
  credentials: TheGraphCredentials
) {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return apiKey;
  }
  const goal = input.goal?.trim();
  if (!goal) {
    return fail("goal is required");
  }

  try {
    const parsed = parseGoal(goal);
    const { result, items } = await searchNetwork(
      apiKey,
      parsed.keyword,
      parsed.network
    );
    const error = graphqlErrorMessage(result.errors);
    if (error && items.length === 0) {
      return fail(error);
    }
    const ranked = items.slice(0, 10);
    return ok({
      goal,
      network: parsed.network ?? null,
      subgraphs: ranked,
      count: ranked.length,
      query_url: subgraphQueryUrlSafe(),
      query_url_x402: subgraphX402Safe(),
      httpStatus: result.httpStatus,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function detailHandler(
  input: DiscoveryInput,
  credentials: TheGraphCredentials
) {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return apiKey;
  }
  const id = input.id?.trim();
  if (!id) {
    return fail("id is required");
  }

  try {
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
      return fail(`Subgraph ${id} was not found on The Graph Network.`);
    }
    const mapped = mapSubgraph(raw);
    const currentVersion = isRecord(raw.currentVersion)
      ? raw.currentVersion
      : undefined;
    const deployment = isRecord(currentVersion?.subgraphDeployment)
      ? currentVersion.subgraphDeployment
      : undefined;
    const manifest = isRecord(deployment?.manifest)
      ? deployment.manifest
      : undefined;
    const owner = isRecord(raw.owner) ? raw.owner : undefined;
    const urls = queryUrlsForId(id);
    return ok({
      ...mapped,
      version: asString(currentVersion?.version),
      owner: asString(owner?.id),
      poweredBySubstreams: manifest?.poweredBySubstreams ?? false,
      startBlock: manifest?.startBlock ?? null,
      indexingRewardAmount: asString(deployment?.indexingRewardAmount),
      stakedTokens: asString(deployment?.stakedTokens),
      example_query: EXAMPLE_QUERY,
      ...urls,
      httpStatus: result.httpStatus,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function schemaHandler(
  input: DiscoveryInput,
  credentials: TheGraphCredentials
) {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return apiKey;
  }
  const resolved = resolveGatewayUrl({
    id: input.id,
    deploymentId: input.deploymentId,
    ipfsHash: input.ipfsHash,
  });
  if ("error" in resolved) {
    return fail(resolved.error);
  }

  try {
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
    const types = asRecordArray(schema.types);
    const entities = types
      .filter((item) => item.kind === "OBJECT")
      .filter((item) => {
        const name = asString(item.name) ?? "";
        return !name.startsWith("_") && !name.startsWith("__");
      })
      .map((item) => ({
        name: asString(item.name),
        fields: asRecordArray(item.fields)
          .map((field) => asString(field.name))
          .filter((name): name is string => Boolean(name)),
      }));
    return ok({
      types: entities,
      count: entities.length,
      query_url: resolved.queryUrl,
      query_url_x402: resolved.x402Url,
      httpStatus: result.httpStatus,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function findByContractHandler(
  input: DiscoveryInput,
  credentials: TheGraphCredentials
) {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return apiKey;
  }
  const contract = input.contract?.trim();
  if (!contract) {
    return fail("contract is required");
  }
  const chain = aliasNetwork(input.chain);

  try {
    let result = await postNetworkSubgraph({
      apiKey,
      query: CONTRACT_SEARCH_QUERY,
      variables: { keyword: contract, first: 20 },
    });
    if (graphqlErrorMessage(result.errors)) {
      result = await postNetworkSubgraph({
        apiKey,
        query: SEARCH_FALLBACK_QUERY,
        variables: { keyword: contract, first: 20 },
      });
    }
    const error = graphqlErrorMessage(result.errors);
    const items = mapSearchHits(result.data, chain);
    if (error && items.length === 0) {
      return fail(error);
    }
    return ok({
      contract,
      chain: chain ?? null,
      subgraphs: items,
      count: items.length,
      query_url: subgraphQueryUrlSafe(),
      query_url_x402: subgraphX402Safe(),
      httpStatus: result.httpStatus,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function withCreds(
  input: DiscoveryInput,
  handler: (
    input: DiscoveryInput,
    credentials: TheGraphCredentials
  ) => Promise<ReturnType<typeof ok> | ReturnType<typeof fail>>
) {
  return withStepLogging(input, async () => {
    const credentials = input.integrationId
      ? ((await fetchCredentials(input.integrationId)) as TheGraphCredentials)
      : {};
    return handler(input, credentials);
  });
}

export async function searchSubgraphsStep(input: DiscoveryInput) {
  "use step";
  return withCreds(input, searchHandler);
}

export async function recommendSubgraphStep(input: DiscoveryInput) {
  "use step";
  return withCreds(input, recommendHandler);
}

export async function getSubgraphDetailStep(input: DiscoveryInput) {
  "use step";
  return withCreds(input, detailHandler);
}

export async function getSchemaStep(input: DiscoveryInput) {
  "use step";
  return withCreds(input, schemaHandler);
}

export async function findByContractStep(input: DiscoveryInput) {
  "use step";
  return withCreds(input, findByContractHandler);
}

export const _integrationType = "the-graph";
