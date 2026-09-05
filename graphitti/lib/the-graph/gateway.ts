import { readJson } from "@/lib/http-json";

export const GRAPH_GATEWAY = "https://gateway.thegraph.com";

export type GraphQLResult = {
  data?: unknown;
  errors?: Array<{ message: string }>;
  httpStatus: number;
  query_url: string;
  query_url_x402: string;
};

export function subgraphQueryUrl(id: string): string {
  return `${GRAPH_GATEWAY}/api/subgraphs/id/${id}`;
}

export function subgraphDeploymentUrl(deploymentId: string): string {
  return `${GRAPH_GATEWAY}/api/subgraphs/id/${deploymentId}`.replace(
    "/subgraphs/id/",
    "/deployments/id/"
  );
}

export function subgraphIpfsUrl(ipfsHash: string): string {
  return `${GRAPH_GATEWAY}/api/subgraphs/id/${ipfsHash}`;
}

export function subgraphX402Url(id: string): string {
  return `${GRAPH_GATEWAY}/api/x402/subgraphs/id/${id}`;
}

export function resolveGatewayUrl(options: {
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
}): { queryUrl: string; x402Url: string } | { error: string } {
  if (options.deploymentId) {
    const queryUrl = `${GRAPH_GATEWAY}/api/deployments/id/${options.deploymentId}`;
    return {
      queryUrl,
      x402Url: `${GRAPH_GATEWAY}/api/x402/deployments/id/${options.deploymentId}`,
    };
  }
  if (options.ipfsHash) {
    return {
      queryUrl: `${GRAPH_GATEWAY}/api/ipfs/${options.ipfsHash}`,
      x402Url: `${GRAPH_GATEWAY}/api/x402/ipfs/${options.ipfsHash}`,
    };
  }
  if (options.id) {
    return {
      queryUrl: subgraphQueryUrl(options.id),
      x402Url: subgraphX402Url(options.id),
    };
  }
  return {
    error: "Provide a subgraph id, deploymentId, or ipfsHash.",
  };
}

export async function graphQlPost(options: {
  url: string;
  apiKey?: string;
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}): Promise<GraphQLResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const response = await fetch(options.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: options.query,
      variables: options.variables,
      operationName: options.operationName,
    }),
  });

  const body = await readJson<{
    data?: unknown;
    errors?: Array<{ message: string }>;
  }>(response);

  const errors = body.errors;
  return {
    data: body.data,
    errors,
    httpStatus: response.status,
    query_url: options.url,
    query_url_x402: options.url.includes("/x402/")
      ? options.url
      : options.url.replace("/api/", "/api/x402/"),
  };
}
