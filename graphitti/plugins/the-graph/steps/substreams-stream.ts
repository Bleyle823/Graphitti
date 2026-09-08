import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { graphQlPost, resolveGatewayUrl } from "@/lib/the-graph/gateway";
import {
  defaultEndpointForNetwork,
  packageSpkgUrl,
  searchSubstreamsPackages,
} from "@/lib/the-graph/substreams-registry";
import type { TheGraphCredentials } from "../credentials";
import {
  aliasNetwork,
  asRecordArray,
  asString,
  graphqlErrorMessage,
  isRecord,
  requireGatewayKey,
} from "./shared";

type StreamInput = StepInput & {
  integrationId?: string;
  id?: string;
  deploymentId?: string;
  ipfsHash?: string;
  entityName?: string;
  entityFields?: string;
  orderBy?: string;
  orderDirection?: string;
  first?: string;
  whereJson?: string;
  minField?: string;
  minValue?: string;
  slug?: string;
  version?: string;
  network?: string;
  moduleName?: string;
  spkg?: string;
  workflowId?: string;
  baseUrl?: string;
  webhookPath?: string;
};

const DEFAULT_ENTITY_FIELDS = [
  "id",
  "blockNumber",
  "shouldAlert",
  "deviationBps",
  "deviationPct",
  "thresholdBps",
  "mainnetSupplyEth",
  "arbSupplyEth",
  "totalSupplyEth",
  "totalBackingEthHuman",
  "excessEthHuman",
];

const INDEXING_STATUS_QUERY = `{
  _meta {
    block { number hash }
    deployment
  }
}`;

function parseFirst(raw: string | undefined): number {
  if (!raw?.trim()) {
    return 5;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }
  return Math.min(parsed, 100);
}

function parseWhereJson(raw: string | undefined):
  | { ok: true; where: Record<string, unknown> | undefined }
  | { ok: false; error: string } {
  if (!raw?.trim()) {
    return { ok: true, where: undefined };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "whereJson must be a JSON object" };
    }
    return { ok: true, where: parsed as Record<string, unknown> };
  } catch (error) {
    return {
      ok: false,
      error: `Invalid whereJson: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function parseEntityFields(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return DEFAULT_ENTITY_FIELDS;
  }
  return raw
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}

function toSnakeCase(key: string): string {
  return key
    .replace(/([A-Z])/g, "_$1")
    .replace(/^_/, "")
    .toLowerCase();
}

function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...row };
  for (const [key, value] of Object.entries(row)) {
    flat[toSnakeCase(key)] = value;
  }
  if (typeof row.shouldAlert === "boolean") {
    flat.should_alert = row.shouldAlert;
  }
  if (typeof row.deviationBps === "number") {
    flat.deviation_bps = row.deviationBps;
  }
  if (typeof row.blockNumber === "string" || typeof row.blockNumber === "number") {
    flat.block_number = String(row.blockNumber);
  }
  if (typeof row.txHash === "string") {
    flat.tx_hash = row.txHash;
  }
  if (typeof row.triggerEvent === "string") {
    flat.trigger_event = row.triggerEvent;
  }
  if (typeof row.totalSupply === "string" || typeof row.totalSupply === "number") {
    flat.total_supply = String(row.totalSupply);
  }
  if (typeof row.totalSupplyEth === "string") {
    flat.total_supply_eth = row.totalSupplyEth;
  }
  if (typeof row.mainnetSupplyEth === "string") {
    flat.mainnet_supply_eth = row.mainnetSupplyEth;
  }
  if (typeof row.arbSupplyEth === "string") {
    flat.arb_supply_eth = row.arbSupplyEth;
  }
  if (typeof row.totalBackingEthHuman === "string") {
    flat.total_backing_eth = row.totalBackingEthHuman;
  } else if (
    typeof row.totalBackingEth === "string" ||
    typeof row.totalBackingEth === "number"
  ) {
    flat.total_backing_eth = String(row.totalBackingEth);
  }
  if (typeof row.excessEthHuman === "string") {
    flat.excess_eth = row.excessEthHuman;
  }
  if (typeof row.deviationPct === "string") {
    flat.deviation_pct = row.deviationPct;
  }
  if (typeof row.thresholdBps === "number") {
    flat.threshold_bps = row.thresholdBps;
  }
  return flat;
}

function passesMinThreshold(
  row: Record<string, unknown>,
  minField: string | undefined,
  minValue: string | undefined
): boolean {
  if (!minField?.trim() || minValue === undefined || minValue.trim() === "") {
    return true;
  }
  const numericMin = Number(minValue);
  if (!Number.isFinite(numericMin)) {
    return true;
  }
  const camel = minField.trim();
  const snake = toSnakeCase(camel);
  const raw = row[camel] ?? row[snake];
  if (typeof raw === "number") {
    return Math.abs(raw) >= numericMin;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && Math.abs(parsed) >= numericMin;
  }
  return true;
}

function entityFilterType(entityName: string): string {
  let singular = entityName;
  if (singular.endsWith("ies")) {
    singular = `${singular.slice(0, -3)}y`;
  } else if (singular.endsWith("s") && !singular.endsWith("ss")) {
    singular = singular.slice(0, -1);
  }
  return `${singular.charAt(0).toUpperCase()}${singular.slice(1)}_filter`;
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
query QuerySubstreamsEntity($first: Int!, $where: ${entityFilterType(entityName)}) {
  ${entityName}(first: $first, orderBy: ${orderBy}, orderDirection: ${orderDirection}, where: $where) {
${fieldBlock}
  }
}
`.trim();
  }
  return `
query QuerySubstreamsEntity($first: Int!) {
  ${entityName}(first: $first, orderBy: ${orderBy}, orderDirection: ${orderDirection}) {
${fieldBlock}
  }
}
`.trim();
}

async function queryEntityHandler(
  input: StreamInput,
  credentials: TheGraphCredentials
) {
  const entityName = input.entityName?.trim();
  if (!entityName) {
    return fail("entityName is required (GraphQL collection field, e.g. backingSnapshots)");
  }
  if (!input.id?.trim() && !input.deploymentId?.trim() && !input.ipfsHash?.trim()) {
    return fail("Subgraph id, deploymentId, or ipfsHash is required");
  }

  const apiKey = requireGatewayKey(credentials);
  if (typeof apiKey !== "string") {
    return apiKey;
  }

  const parsedWhere = parseWhereJson(input.whereJson);
  if (!parsedWhere.ok) {
    return fail(parsedWhere.error);
  }

  const resolved = resolveGatewayUrl({
    id: input.id,
    deploymentId: input.deploymentId,
    ipfsHash: input.ipfsHash,
  });
  if ("error" in resolved) {
    return fail(resolved.error);
  }

  const fields = parseEntityFields(input.entityFields);
  const orderBy = input.orderBy?.trim() || "blockNumber";
  const orderDirection =
    input.orderDirection?.trim() === "asc" ? "asc" : "desc";
  const first = parseFirst(input.first);
  const useWhere = Boolean(parsedWhere.where && Object.keys(parsedWhere.where).length > 0);
  const query = buildEntityQuery(
    entityName,
    fields,
    orderBy,
    orderDirection,
    useWhere
  );

  try {
    const result = await graphQlPost({
      url: resolved.queryUrl,
      apiKey,
      query,
      variables: useWhere
        ? { first, where: parsedWhere.where }
        : { first },
    });

    const gqlError = graphqlErrorMessage(result.errors);
    if (gqlError) {
      return fail(gqlError);
    }

    const data = isRecord(result.data) ? result.data : {};
    const rawRows = asRecordArray(data[entityName]);
    const rows = rawRows
      .map((row) => flattenRow(row))
      .filter((row) =>
        passesMinThreshold(row, input.minField, input.minValue)
      );

    const latest = rows[0] ?? null;

    return ok({
      rows,
      latest,
      has_match: rows.length > 0,
      count: rows.length,
      entity_name: entityName,
      should_alert: latest?.should_alert === true,
      deviation_bps:
        typeof latest?.deviation_bps === "number"
          ? latest.deviation_bps
          : Number(latest?.deviation_bps ?? 0) || 0,
      block_number: latest?.block_number ?? "",
      tx_hash: latest?.tx_hash ?? "",
      trigger_event: latest?.trigger_event ?? "",
      total_supply: latest?.total_supply ?? "",
      total_supply_eth: latest?.total_supply_eth ?? "",
      mainnet_supply_eth: latest?.mainnet_supply_eth ?? "",
      arb_supply_eth: latest?.arb_supply_eth ?? "",
      total_backing_eth: latest?.total_backing_eth ?? "",
      excess_eth: latest?.excess_eth ?? "",
      deviation_pct: latest?.deviation_pct ?? "",
      threshold_bps:
        typeof latest?.threshold_bps === "number"
          ? latest.threshold_bps
          : Number(latest?.threshold_bps ?? 0) || 0,
      note: "Pulls indexed Substreams graph_out entities. Does not start gRPC streaming.",
      query_url: resolved.queryUrl,
      query_url_x402: resolved.x402Url,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

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

const DEPLOY_STEPS = [
  "substreams auth && substreams build",
  "substreams run ./substreams.yaml <map_module> -s <start_block> -t +100 -o jsonl",
  "Add graph_out module and matching schema.graphql",
  "graph auth --studio && graph codegen && graph build && graph deploy --studio <slug>",
  "Paste subgraph id into query-substreams-entity node",
];

async function resolvePackageHandler(
  input: StreamInput,
  credentials: TheGraphCredentials
) {
  const slug = input.slug?.trim() || "your-package-slug";
  const network = aliasNetwork(input.network) ?? input.network?.trim() ?? "ethereum";

  try {
    const body = await searchSubstreamsPackages({
      query: slug,
      apiKey: credentials.SUBSTREAMS_API_KEY?.trim(),
    });
    const record = isRecord(body) ? body : { packages: [] };
    const packages = asRecordArray(record.packages);
    const matched = packages.find((item) => {
      const name = packageName(item);
      return name?.toLowerCase() === slug.toLowerCase();
    });

    let version = input.version?.trim() || (matched ? latestVersion(matched) : undefined);
    const endpoint =
      defaultEndpointForNetwork(network) ??
      defaultEndpointForNetwork("ethereum");

    if (!version) {
      return ok({
        slug,
        found: false,
        version: null,
        spkg: null,
        reference: null,
        endpoint,
        deploy_steps: DEPLOY_STEPS,
        note: `Package "${slug}" not found in registry. Build and publish your spkg first.`,
        query_url: "https://substreams.dev/v1/registry/packages",
        query_url_x402: "",
      });
    }

    const spkg = packageSpkgUrl(slug, version);
    return ok({
      slug,
      found: true,
      version,
      spkg,
      reference: `https://api.substreams.dev/v1/packages/${slug}/${version}`,
      endpoint,
      package: matched ?? null,
      deploy_steps: DEPLOY_STEPS,
      note: "Setup only. Deploy Substreams + subgraph once; workflow nodes pull indexed data.",
      query_url: spkg,
      query_url_x402: "",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function webhookSetupHandler(input: StreamInput) {
  const slug = input.slug?.trim() || "your-package-slug";
  const version = input.version?.trim() || "v0.1.0";
  const moduleName = input.moduleName?.trim() || "map_events";
  const network = aliasNetwork(input.network) ?? input.network?.trim() ?? "ethereum";
  const spkg =
    input.spkg?.trim() ||
    packageSpkgUrl(slug, version) ||
    `./${slug}.spkg`;
  const endpoint =
    defaultEndpointForNetwork(network) ??
    defaultEndpointForNetwork("ethereum") ??
    "mainnet.eth.streamingfast.io:443";
  const baseUrl = input.baseUrl?.trim() || "https://YOUR_GRAPHITTI_HOST";
  const workflowId = input.workflowId?.trim() || "YOUR_WORKFLOW_ID";
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
    env_vars: [
      "SUBSTREAMS_API_KEY",
      "GRAPHITTI_API_KEY (Authorization: Bearer header on POST)",
    ],
    bridge_note:
      "Run sink externally or via Docker Compose. Graphitti webhook workflow receives POST JSON; it does not start Substreams.",
    query_url: webhookUrl,
    query_url_x402: "",
  });
}

async function streamStatusHandler(
  input: StreamInput,
  credentials: TheGraphCredentials
) {
  if (!input.id?.trim() && !input.deploymentId?.trim() && !input.ipfsHash?.trim()) {
    return fail("Subgraph id, deploymentId, or ipfsHash is required for indexing status");
  }

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
      query: INDEXING_STATUS_QUERY,
    });
    const gqlError = graphqlErrorMessage(result.errors);
    if (gqlError) {
      return fail(gqlError);
    }

    const meta = isRecord(result.data) ? result.data._meta : null;
    const blockNumber =
      isRecord(meta) && isRecord(meta.block)
        ? asString(meta.block.number) ?? meta.block.number
        : null;

    return ok({
      meta,
      indexed_block_number: blockNumber,
      deployment: isRecord(meta) ? meta.deployment : null,
      stream_running_note:
        "Substreams gRPC runs outside Graphitti. This step only checks subgraph indexer sync via _meta.",
      portal_note:
        "For hosted SQL sink status, use The Graph Market Portal (THEGRAPH_MARKET_BEARER).",
      query_url: resolved.queryUrl,
      query_url_x402: resolved.x402Url,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function withCreds(
  input: StreamInput,
  handler: (
    input: StreamInput,
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

export async function querySubstreamsEntityStep(input: StreamInput) {
  "use step";
  return withCreds(input, queryEntityHandler);
}

export async function resolveSubstreamsPackageStep(input: StreamInput) {
  "use step";
  return withCreds(input, resolvePackageHandler);
}

export async function substreamsWebhookSetupStep(input: StreamInput) {
  "use step";
  return withStepLogging(input, () => webhookSetupHandler(input));
}

export async function getSubstreamsStreamStatusStep(input: StreamInput) {
  "use step";
  return withCreds(input, streamStatusHandler);
}

export const _integrationType = "the-graph";
