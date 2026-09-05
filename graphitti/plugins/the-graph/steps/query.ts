import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { graphQlPost, resolveGatewayUrl } from "@/lib/the-graph/gateway";
import type { TheGraphCredentials } from "../credentials";
import {
  graphqlErrorMessage,
  parseVariablesJson,
  requireGatewayKey,
} from "./shared";

type QueryInput = StepInput & {
  integrationId?: string;
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
  query?: string;
  variables?: string;
  operationName?: string;
  protocol?: string;
};

const INDEXING_STATUS_QUERY = `{
  _meta {
    block { number hash }
    deployment
  }
}`;

const LENDING_SNAPSHOT_QUERY = `
query LendingSnapshot {
  protocols: lendingProtocols(first: 5) {
    id
    name
    slug
    network
    lendingType
    totalValueLockedUSD
    totalDepositBalanceUSD
    totalBorrowBalanceUSD
  }
  markets(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    name
    inputToken { symbol }
    totalValueLockedUSD
    totalDepositBalanceUSD
    totalBorrowBalanceUSD
    rates { rate side type }
  }
}
`;

async function runGatewayQuery(
  input: QueryInput,
  credentials: TheGraphCredentials,
  query: string,
  variables?: Record<string, unknown>,
  operationName?: string
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

  const result = await graphQlPost({
    url: resolved.queryUrl,
    apiKey,
    query,
    variables,
    operationName,
  });

  return ok({
    data: result.data ?? null,
    errors: result.errors ?? [],
    httpStatus: result.httpStatus,
    query_url: resolved.queryUrl,
    query_url_x402: resolved.x402Url,
  });
}

async function queryHandler(input: QueryInput, credentials: TheGraphCredentials) {
  const query = input.query?.trim();
  if (!query) {
    return fail("query is required. Cap list fields with first (for example first: 20).");
  }
  const parsed = parseVariablesJson(input.variables);
  if (!parsed.ok) {
    return fail(parsed.error);
  }
  try {
    return await runGatewayQuery(
      input,
      credentials,
      query,
      parsed.variables,
      input.operationName?.trim() || undefined
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function indexingHandler(
  input: QueryInput,
  credentials: TheGraphCredentials
) {
  try {
    const result = await runGatewayQuery(
      input,
      credentials,
      INDEXING_STATUS_QUERY
    );
    if (!result.success) {
      return result;
    }
    const error = graphqlErrorMessage(result.data.errors);
    if (error) {
      return fail(error);
    }
    return ok({
      meta: result.data.data,
      httpStatus: result.data.httpStatus,
      query_url: result.data.query_url,
      query_url_x402: result.data.query_url_x402,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function lendingHandler(
  input: QueryInput,
  credentials: TheGraphCredentials
) {
  if (!input.id?.trim() && !input.deploymentId?.trim() && !input.ipfsHash?.trim()) {
    return fail("Provide a subgraph id (Messari-shaped lending subgraph).");
  }
  try {
    const result = await runGatewayQuery(
      input,
      credentials,
      LENDING_SNAPSHOT_QUERY
    );
    if (!result.success) {
      return result;
    }
    const error = graphqlErrorMessage(result.data.errors);
    if (error) {
      return fail(error);
    }
    return ok({
      protocol: input.protocol?.trim() || null,
      snapshot: result.data.data,
      httpStatus: result.data.httpStatus,
      query_url: result.data.query_url,
      query_url_x402: result.data.query_url_x402,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function withCreds(
  input: QueryInput,
  handler: (
    input: QueryInput,
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

export async function querySubgraphStep(input: QueryInput) {
  "use step";
  return withCreds(input, queryHandler);
}

export async function getIndexingStatusStep(input: QueryInput) {
  "use step";
  return withCreds(input, indexingHandler);
}

export async function queryLendingSnapshotStep(input: QueryInput) {
  "use step";
  return withCreds(input, lendingHandler);
}

export const _integrationType = "the-graph";
