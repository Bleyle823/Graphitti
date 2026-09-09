import { fail, ok, readJson } from "./http.js";
import { strParam } from "./shared.js";
import type { ExecuteParams, GraphCredentials, ToolResult } from "./types.js";

function baseUrl(credentials: GraphCredentials): string {
  return (credentials.GRAPHITTI_BASE_URL ?? "https://graphitti-five.vercel.app").replace(/\/$/, "");
}

function authHeaders(credentials: GraphCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (credentials.GRAPHITTI_API_KEY?.trim()) {
    headers.Authorization = `Bearer ${credentials.GRAPHITTI_API_KEY.trim()}`;
  }
  return headers;
}

function requireGraphittiKey(credentials: GraphCredentials): ToolResult | null {
  if (!credentials.GRAPHITTI_API_KEY?.trim()) {
    return fail("GRAPHITTI_API_KEY is not configured.");
  }
  return null;
}

async function b2bFetch(
  credentials: GraphCredentials,
  path: string,
  init?: RequestInit
): Promise<ToolResult> {
  const keyError = requireGraphittiKey(credentials);
  if (keyError) {
    return keyError;
  }
  const response = await fetch(`${baseUrl(credentials)}/api/b2b/v1${path}`, {
    ...init,
    headers: { ...authHeaders(credentials), ...(init?.headers as Record<string, string>) },
  });
  const body = await readJson<Record<string, unknown>>(response);
  if (!response.ok) {
    return fail(typeof body.error === "string" ? body.error : `Graphitti B2B HTTP ${response.status}`);
  }
  return ok(body);
}

export async function graphWhoami(
  _params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  return b2bFetch(credentials, "/whoami");
}

export async function graphSearchWorkflows(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const url = new URL(`${baseUrl(credentials)}/api/b2b/v1/workflows`);
  const q = strParam(params, "q");
  const category = strParam(params, "category") ?? "the-graph";
  if (q) {
    url.searchParams.set("q", q);
  }
  url.searchParams.set("category", category);
  url.searchParams.set("limit", String(numLimit(params.limit)));
  const keyError = requireGraphittiKey(credentials);
  if (keyError) {
    return keyError;
  }
  const response = await fetch(url.toString(), { headers: authHeaders(credentials) });
  const body = await readJson<Record<string, unknown>>(response);
  if (!response.ok) {
    return fail(typeof body.error === "string" ? body.error : `Graphitti B2B HTTP ${response.status}`);
  }
  return ok({ ...body, query_url: url.toString() });
}

export async function graphGetListing(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const slug = strParam(params, "slug");
  if (!slug) {
    return fail("slug is required");
  }
  return b2bFetch(credentials, `/listings/${encodeURIComponent(slug)}`);
}

export async function graphCallWorkflow(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const slug = strParam(params, "slug");
  if (!slug) {
    return fail("slug is required");
  }
  const input =
    params.input && typeof params.input === "object" && !Array.isArray(params.input)
      ? (params.input as Record<string, unknown>)
      : {};
  const keyError = requireGraphittiKey(credentials);
  if (keyError) {
    return keyError;
  }
  const response = await fetch(
    `${baseUrl(credentials)}/api/b2b/v1/listings/${encodeURIComponent(slug)}/call`,
    {
      method: "POST",
      headers: authHeaders(credentials),
      body: JSON.stringify({ input }),
    }
  );
  const body = await readJson<Record<string, unknown>>(response);
  if (response.status === 402) {
    return ok({
      payment_required: true,
      status: 402,
      details: body,
      note: "Listed workflow requires payment or owner GRAPHITTI_API_KEY.",
    });
  }
  if (!response.ok) {
    return fail(typeof body.error === "string" ? body.error : `Graphitti B2B HTTP ${response.status}`);
  }
  return ok({ result: body, slug });
}

export async function graphExecuteWorkflow(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const workflowId = strParam(params, "workflow_id") ?? strParam(params, "workflowId");
  if (!workflowId) {
    return fail("workflow_id is required");
  }
  const input =
    params.input && typeof params.input === "object" && !Array.isArray(params.input)
      ? (params.input as Record<string, unknown>)
      : {};
  return b2bFetch(credentials, `/workflows/${encodeURIComponent(workflowId)}/execute`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

export async function graphGetExecution(
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const executionId = strParam(params, "execution_id") ?? strParam(params, "executionId");
  if (!executionId) {
    return fail("execution_id is required");
  }
  return b2bFetch(
    credentials,
    `/workflows/executions/${encodeURIComponent(executionId)}`
  );
}

function numLimit(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(value, 50);
  }
  return 20;
}
