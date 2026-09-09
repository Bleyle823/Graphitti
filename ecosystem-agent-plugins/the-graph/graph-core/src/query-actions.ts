import { requireGatewayKey } from "./credentials.js";
import { graphQlPost, resolveGatewayUrl } from "./gateway.js";
import { fail, ok } from "./http.js";
import {
  graphqlErrorMessage,
  isRecord,
  parseVariablesJson,
  strParam,
} from "./shared.js";
import type { ExecuteParams, GraphCredentials, ToolResult } from "./types.js";

export async function graphQuerySubgraph(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const query = strParam(params, "query");
  if (!query) {
    return fail("query is required. Cap list fields with first (for example first: 20).");
  }
  const parsed = parseVariablesJson(
    strParam(params, "variables") ??
      (typeof params.variables === "object" && params.variables !== null
        ? JSON.stringify(params.variables)
        : undefined)
  );
  if (!parsed.ok) {
    return fail(parsed.error);
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
    query,
    variables: parsed.variables,
    operationName: strParam(params, "operation_name") ?? strParam(params, "operationName"),
  });
  return ok({
    data: result.data ?? null,
    errors: result.errors ?? [],
    http_status: result.httpStatus,
    query_url: resolved.queryUrl,
    query_url_x402: resolved.x402Url,
    x402_note: "Never auto-pay x402. Use query_url with THEGRAPH_API_KEY only.",
  });
}

const INDEXING_STATUS_QUERY = `{
  _meta {
    block { number hash }
    deployment
  }
}`;

export async function graphGetIndexingStatus(
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
    query: INDEXING_STATUS_QUERY,
  });
  const error = graphqlErrorMessage(result.errors);
  if (error) {
    return fail(error);
  }
  const root = isRecord(result.data) ? result.data : {};
  return ok({
    meta: root._meta ?? null,
    query_url: resolved.queryUrl,
    query_url_x402: resolved.x402Url,
    http_status: result.httpStatus,
  });
}

const LENDING_SNAPSHOT_QUERY = `
query LendingSnapshot {
  protocols: lendingProtocols(first: 5) {
    id
    name
    slug
    network
    totalValueLockedUSD
  }
  markets(first: 20, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    name
    totalValueLockedUSD
  }
}
`;

export async function graphQueryLendingSnapshot(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  if (
    !strParam(params, "subgraph_id") &&
    !strParam(params, "deployment_id") &&
    !strParam(params, "ipfs_hash")
  ) {
    return fail("Provide subgraph_id for a Messari-shaped lending subgraph.");
  }
  const resolved = resolveGatewayUrl({
    id: strParam(params, "subgraph_id") ?? strParam(params, "id"),
    deploymentId: strParam(params, "deployment_id"),
    ipfsHash: strParam(params, "ipfs_hash"),
  });
  if ("error" in resolved) {
    return fail(resolved.error);
  }
  const result = await graphQlPost({
    url: resolved.queryUrl,
    apiKey,
    query: LENDING_SNAPSHOT_QUERY,
  });
  const error = graphqlErrorMessage(result.errors);
  if (error) {
    return fail(error);
  }
  return ok({
    protocol: strParam(params, "protocol") ?? null,
    snapshot: result.data ?? null,
    query_url: resolved.queryUrl,
    query_url_x402: resolved.x402Url,
    http_status: result.httpStatus,
  });
}
