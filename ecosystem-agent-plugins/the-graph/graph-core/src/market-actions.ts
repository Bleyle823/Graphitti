import { requireMarketBearer } from "./credentials.js";
import { fail, ok } from "./http.js";
import { marketGet } from "./market.js";
import { strParam } from "./shared.js";
import type { ExecuteParams, GraphCredentials, ToolResult } from "./types.js";

const PORTAL = "/sf.portalapi.v1.PortalApi";
const HOSTED = "/sf.portalapi.v1.HostedService";

function withOrg(path: string, organizationId?: string) {
  if (!organizationId?.trim()) {
    return path;
  }
  const url = new URL(path, "https://admin.streamingfast.io");
  url.searchParams.set("organization_id", organizationId.trim());
  return `${url.pathname}${url.search}`;
}

async function readMarket(
  credentials: GraphCredentials,
  path: string
): Promise<ToolResult> {
  const bearer = requireMarketBearer(credentials);
  if (typeof bearer !== "string") {
    return fail(bearer);
  }
  const result = await marketGet(path, bearer);
  if (result.error) {
    return fail(result.error);
  }
  return ok({
    result: result.data,
    http_status: result.httpStatus,
    query_url: `https://admin.streamingfast.io${path}`,
    query_url_x402: "",
  });
}

export async function graphGetSubscription(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  return readMarket(
    credentials,
    withOrg(`${PORTAL}/GetOrganizationSubscription`, strParam(params, "organization_id"))
  );
}

export async function graphGetUsageSummary(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  return readMarket(
    credentials,
    withOrg(`${PORTAL}/MultiServiceUsageSummaryByOrganization`, strParam(params, "organization_id"))
  );
}

export async function graphGetBillPreview(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const org = strParam(params, "organization_id");
  const path = org
    ? `${PORTAL}/GetUsageBilling?organization_id=${encodeURIComponent(org)}&usage=%7B%7D`
    : `${PORTAL}/GetUsageBilling?usage=%7B%7D`;
  return readMarket(credentials, path);
}

export async function graphGetActiveConnections(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  return readMarket(
    credentials,
    withOrg(`${PORTAL}/ActiveConnections`, strParam(params, "organization_id"))
  );
}

export async function graphListHostedDeployments(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  return readMarket(
    credentials,
    withOrg(`${HOSTED}/ListDeployments`, strParam(params, "organization_id"))
  );
}

export async function graphGetDeploymentState(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const deploymentId = strParam(params, "deployment_id");
  if (!deploymentId) {
    return fail("deployment_id is required");
  }
  return readMarket(
    credentials,
    `${HOSTED}/GetDeploymentState?deployment_id=${encodeURIComponent(deploymentId)}`
  );
}

export async function graphGetDeploymentEvents(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const deploymentId = strParam(params, "deployment_id");
  if (!deploymentId) {
    return fail("deployment_id is required");
  }
  const limit = strParam(params, "limit") ?? "20";
  return readMarket(
    credentials,
    `${HOSTED}/GetDeploymentEvents?deployment_id=${encodeURIComponent(deploymentId)}&limit=${encodeURIComponent(limit)}`
  );
}

export async function graphGetDeploymentLogs(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const deploymentId = strParam(params, "deployment_id");
  if (!deploymentId) {
    return fail("deployment_id is required");
  }
  const tail = strParam(params, "tail_lines") ?? "100";
  return readMarket(
    credentials,
    `${HOSTED}/GetDeploymentLogs?deployment_id=${encodeURIComponent(deploymentId)}&tail_lines=${encodeURIComponent(tail)}`
  );
}
