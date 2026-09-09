import { requireGatewayKey } from "./credentials.js";
import { fail, ok } from "./http.js";
import { aliasNetwork, strParam } from "./shared.js";
import { tokenApiGet } from "./token-api.js";
import type { ExecuteParams, GraphCredentials, ToolResult } from "./types.js";

function tokenNetwork(network?: string): string | undefined {
  const aliased = aliasNetwork(network);
  if (aliased === "arbitrum") {
    return "arbitrum-one";
  }
  return aliased;
}

async function tokenGet(
  credentials: GraphCredentials,
  path: string,
  searchParams: Record<string, string | undefined>
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const result = await tokenApiGet(path, apiKey, searchParams);
  if (result.error) {
    return fail(result.error);
  }
  return ok({
    result: result.data,
    http_status: result.httpStatus,
    query_url: `https://token-api.thegraph.com${path}`,
    query_url_x402: "",
  });
}

export async function graphGetTokenBalances(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const network = tokenNetwork(strParam(params, "network"));
  const address = strParam(params, "address");
  if (!network || !address) {
    return fail("network and address are required");
  }
  return tokenGet(credentials, "/v1/evm/balances", { network, address });
}

export async function graphGetTokenTransfers(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const network = tokenNetwork(strParam(params, "network"));
  const address = strParam(params, "address");
  if (!network || !address) {
    return fail("network and address are required");
  }
  return tokenGet(credentials, "/v1/evm/transfers", {
    network,
    address,
    startTime: strParam(params, "start_time") ?? strParam(params, "startTime"),
    endTime: strParam(params, "end_time") ?? strParam(params, "endTime"),
    age: strParam(params, "age"),
  });
}

export async function graphGetTokenHolders(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const network = tokenNetwork(strParam(params, "network"));
  const token = strParam(params, "token");
  if (!network || !token) {
    return fail("network and token are required");
  }
  return tokenGet(credentials, "/v1/evm/holders", { network, token });
}

export async function graphGetDexSwaps(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const network = tokenNetwork(strParam(params, "network"));
  if (!network) {
    return fail("network is required");
  }
  return tokenGet(credentials, "/v1/evm/swaps", {
    network,
    pool: strParam(params, "pool"),
  });
}

export async function graphGetNftActivity(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const network = tokenNetwork(strParam(params, "network"));
  const address = strParam(params, "address");
  if (!network || !address) {
    return fail("network and address are required");
  }
  return tokenGet(credentials, "/v1/evm/nft/transfers", { network, address });
}
