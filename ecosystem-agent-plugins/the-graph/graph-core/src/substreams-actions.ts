import { requireGatewayKey } from "./credentials.js";
import { graphQlPost, resolveGatewayUrl } from "./gateway.js";
import { fail, ok } from "./http.js";
import {
  aliasNetwork,
  asRecordArray,
  asString,
  graphqlErrorMessage,
  isRecord,
  numParam,
  strParam,
} from "./shared.js";
import {
  defaultEndpointForNetwork,
  DEPLOY_CHECKLIST,
  packageSpkgUrl,
  searchSubstreamsPackages,
} from "./substreams-registry.js";
import type { ExecuteParams, GraphCredentials, ToolResult } from "./types.js";

const DEFAULT_ENTITY_FIELDS = [
  "id",
  "blockNumber",
  "shouldAlert",
  "deviationBps",
];

function packageName(item: Record<string, unknown>): string | undefined {
  return asString(item.slug) ?? asString(item.name) ?? asString(item.id);
}

function latestVersion(item: Record<string, unknown>): string | undefined {
  return (
    asString(item.latestVersion) ??
    asString(item.version) ??
    asString(item.latest_version)
  );
}

export async function graphSearchSubstreamsPackages(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  try {
    const body = await searchSubstreamsPackages({
      query: strParam(params, "query"),
      organization: strParam(params, "organization"),
      featured: strParam(params, "featured"),
      page: strParam(params, "page"),
      apiKey: credentials.SUBSTREAMS_API_KEY?.trim(),
    });
    const record = isRecord(body) ? body : { packages: [] };
    const packages = asRecordArray(record.packages);
    return ok({
      packages,
      has_more: record.hasMore ?? false,
      count: packages.length,
      query_url: "https://substreams.dev/v1/registry/packages",
      query_url_x402: "",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function graphGetSubstreamsPackage(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const slug = strParam(params, "slug");
  if (!slug) {
    return fail("slug is required");
  }
  let version = strParam(params, "version");
  const body = await searchSubstreamsPackages({
    query: slug,
    apiKey: credentials.SUBSTREAMS_API_KEY?.trim(),
  });
  const record = isRecord(body) ? body : { packages: [] };
  const packages = asRecordArray(record.packages);
  const matched = packages.find(
    (item) => packageName(item)?.toLowerCase() === slug.toLowerCase()
  );
  if (!version) {
    version = matched ? latestVersion(matched) : undefined;
  }
  if (!version) {
    return fail(`Could not resolve version for package "${slug}". Pass version.`);
  }
  const spkg = packageSpkgUrl(slug, version);
  return ok({
    slug,
    version,
    spkg,
    reference: `https://api.substreams.dev/v1/packages/${slug}/${version}`,
    package: matched ?? null,
    query_url: spkg,
    query_url_x402: "",
  });
}

export async function graphGetSubstreamsEndpoint(
  params: ExecuteParams,
  _credentials: GraphCredentials
): Promise<ToolResult> {
  const network = aliasNetwork(strParam(params, "network")) ?? strParam(params, "network");
  if (!network) {
    return fail("network is required");
  }
  const endpoint = defaultEndpointForNetwork(network);
  if (!endpoint) {
    return fail(`No default Substreams endpoint for network "${network}".`);
  }
  return ok({
    network,
    endpoint,
    query_url: endpoint,
    query_url_x402: "",
  });
}

export async function graphResolveSubstreamsPackage(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const pkg = await graphGetSubstreamsPackage(params, credentials);
  if (!pkg.success) {
    return pkg;
  }
  const network = aliasNetwork(strParam(params, "network")) ?? "ethereum";
  const endpoint = defaultEndpointForNetwork(network) ?? "";
  return ok({
    ...pkg.data,
    found: true,
    endpoint,
    deploy_steps: DEPLOY_CHECKLIST,
    note: "Setup only. Substreams gRPC runs outside the agent.",
  });
}

function parseEntityFields(raw?: string): string[] {
  if (!raw?.trim()) {
    return DEFAULT_ENTITY_FIELDS;
  }
  return raw
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}

function parseWhereJson(raw?: string):
  | { ok: true; where: Record<string, unknown> | undefined }
  | { ok: false; error: string } {
  if (!raw?.trim()) {
    return { ok: true, where: undefined };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "where_json must be a JSON object" };
    }
    return { ok: true, where: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      error: `Invalid where_json: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function buildEntityQuery(
  entityName: string,
  fields: string[],
  orderBy: string,
  orderDirection: string,
  useWhere: boolean
): string {
  const fieldBlock = fields.map((field) => `      ${field}`).join("\n");
  if (useWhere) {
    return `
query QuerySubstreamsEntity($first: Int!, $where: ${entityName.slice(0, -1)}_filter) {
  ${entityName}(first: $first, orderBy: ${orderBy}, orderDirection: ${orderDirection}, where: $where) {
${fieldBlock}
  }
}`.trim();
  }
  return `
query QuerySubstreamsEntity($first: Int!) {
  ${entityName}(first: $first, orderBy: ${orderBy}, orderDirection: ${orderDirection}) {
${fieldBlock}
  }
}`.trim();
}

export async function graphQuerySubstreamsEntity(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
  }
  const entityName = strParam(params, "entity_name") ?? strParam(params, "entityName");
  if (!entityName) {
    return fail("entity_name is required (GraphQL collection, e.g. backingSnapshots)");
  }
  const resolved = resolveGatewayUrl({
    id: strParam(params, "subgraph_id") ?? strParam(params, "id"),
    deploymentId: strParam(params, "deployment_id"),
    ipfsHash: strParam(params, "ipfs_hash"),
  });
  if ("error" in resolved) {
    return fail(resolved.error);
  }
  const parsedWhere = parseWhereJson(strParam(params, "where_json") ?? strParam(params, "whereJson"));
  if (!parsedWhere.ok) {
    return fail(parsedWhere.error);
  }
  const fields = parseEntityFields(strParam(params, "entity_fields") ?? strParam(params, "entityFields"));
  const orderBy = strParam(params, "order_by") ?? strParam(params, "orderBy") ?? "blockNumber";
  const orderDirection = strParam(params, "order_direction") === "asc" ? "asc" : "desc";
  const first = Math.min(numParam(params, "first") ?? 5, 100);
  const useWhere = Boolean(parsedWhere.where && Object.keys(parsedWhere.where).length > 0);
  const query = buildEntityQuery(entityName, fields, orderBy, orderDirection, useWhere);
  const result = await graphQlPost({
    url: resolved.queryUrl,
    apiKey,
    query,
    variables: useWhere ? { first, where: parsedWhere.where } : { first },
  });
  const gqlError = graphqlErrorMessage(result.errors);
  if (gqlError) {
    return fail(gqlError);
  }
  const data = isRecord(result.data) ? result.data : {};
  const rows = asRecordArray(data[entityName]);
  const latest = rows[0] ?? null;
  return ok({
    rows,
    latest,
    has_match: rows.length > 0,
    count: rows.length,
    entity_name: entityName,
    should_alert: latest?.shouldAlert === true,
    query_url: resolved.queryUrl,
    query_url_x402: resolved.x402Url,
    note: "Reads indexed Substreams graph_out entities via subgraph GraphQL. Does not start gRPC.",
  });
}

export async function graphSubstreamsWebhookSetup(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const slug = strParam(params, "slug") ?? "your-package-slug";
  const version = strParam(params, "version") ?? "v0.1.0";
  const moduleName = strParam(params, "module_name") ?? strParam(params, "moduleName") ?? "map_events";
  const network = aliasNetwork(strParam(params, "network")) ?? "ethereum";
  const spkg =
    strParam(params, "spkg") ?? packageSpkgUrl(slug, version);
  const endpoint =
    defaultEndpointForNetwork(network) ?? "mainnet.eth.streamingfast.io:443";
  const baseUrl =
    strParam(params, "base_url") ??
    strParam(params, "graphitti_base_url") ??
    credentials.GRAPHITTI_BASE_URL ??
    "https://graphitti-five.vercel.app";
  const workflowId = strParam(params, "workflow_id") ?? strParam(params, "workflowId") ?? "YOUR_WORKFLOW_ID";
  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/workflows/${workflowId}/webhook`;
  const sinkCommand = [
    "substreams sink webhook",
    `"${webhookUrl}"`,
    spkg.startsWith("http") ? spkg : `"${spkg}"`,
    moduleName,
    `-e ${endpoint}`,
  ].join(" ");
  return ok({
    webhook_url: webhookUrl,
    sink_command: sinkCommand,
    spkg,
    module_name: moduleName,
    endpoint,
    env_vars: ["SUBSTREAMS_API_KEY", "GRAPHITTI_API_KEY (Authorization: Bearer on webhook POST)"],
    bridge_note:
      "Run sink externally. Graphitti webhook workflow receives POST JSON; agent does not start Substreams.",
    query_url: webhookUrl,
    query_url_x402: "",
  });
}

export async function graphGetSubstreamsStreamStatus(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return fail(apiKey);
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
    query: `{ _meta { block { number hash } deployment } }`,
  });
  const gqlError = graphqlErrorMessage(result.errors);
  if (gqlError) {
    return fail(gqlError);
  }
  const root = isRecord(result.data) ? result.data : {};
  const meta = isRecord(root._meta) ? root._meta : null;
  return ok({
    meta,
    stream_running_note:
      "Substreams gRPC runs outside the agent. This checks subgraph indexer sync via _meta.",
    portal_note: "For hosted SQL sink status, use graph_get_deployment_state with THEGRAPH_MARKET_BEARER.",
    query_url: resolved.queryUrl,
    query_url_x402: resolved.x402Url,
  });
}

export async function graphSubstreamsRun(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const maxMessages = numParam(params, "max_messages") ?? numParam(params, "maxMessages") ?? 10;
  if (maxMessages > 100) {
    return fail("max_messages cannot exceed 100. Use graph_query_substreams_entity for indexed reads.");
  }
  const slug = strParam(params, "slug");
  const moduleName = strParam(params, "module") ?? strParam(params, "module_name");
  if (!slug || !moduleName) {
    return fail("slug and module are required for bounded Substreams runs.");
  }
  if (!credentials.SUBSTREAMS_API_KEY?.trim()) {
    return fail("SUBSTREAMS_API_KEY is required for graph_substreams_run.");
  }
  return ok({
    status: "not_implemented_in_v1",
    message:
      "Bounded gRPC streaming is optional in v1. Use graph_query_substreams_entity for indexed entity reads, or run the sink_command from graph_substreams_webhook_setup externally.",
    suggested_alternatives: [
      "graph_query_substreams_entity",
      "graph_substreams_webhook_setup",
      "graph_resolve_substreams_package",
    ],
    slug,
    module: moduleName,
    max_messages: maxMessages,
  });
}
