import { readJson, fail, ok } from "./http.js";
import { strParam } from "./shared.js";
import type { ExecuteParams, PrivyCredentials, ToolResult } from "./types.js";

function baseUrl(credentials: PrivyCredentials): string {
  return (credentials.GRAPHITTI_BASE_URL ?? "https://graphitti-five.vercel.app").replace(/\/$/, "");
}

function authHeaders(credentials: PrivyCredentials): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${credentials.GRAPHITTI_API_KEY?.trim() ?? ""}`,
  };
}

function requireGraphittiKey(credentials: PrivyCredentials): ToolResult | null {
  if (!credentials.GRAPHITTI_API_KEY?.trim()) {
    return fail("GRAPHITTI_API_KEY is not configured.");
  }
  return null;
}

async function b2bFetch(
  credentials: PrivyCredentials,
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

export async function privyWhoami(
  _params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  return b2bFetch(credentials, "/whoami");
}

export async function privySearchWorkflows(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const url = new URL(`${baseUrl(credentials)}/api/b2b/v1/workflows`);
  const q = strParam(params, "q");
  const category = strParam(params, "category") ?? "privy";
  if (q) {
    url.searchParams.set("q", q);
  }
  url.searchParams.set("category", category);
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

export async function privyGetListing(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const slug = strParam(params, "slug");
  if (!slug) {
    return fail("slug is required");
  }
  return b2bFetch(credentials, `/listings/${encodeURIComponent(slug)}`);
}

export async function privyCallWorkflow(
  params: ExecuteParams,
  credentials: PrivyCredentials
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

export async function privyExecuteWorkflow(
  params: ExecuteParams,
  credentials: PrivyCredentials
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

export async function privyGetExecution(
  params: ExecuteParams,
  credentials: PrivyCredentials
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

export async function privyGetLinkedWallet(
  _params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  return b2bFetch(credentials, "/wallet");
}

export async function privyGetTreasury(
  _params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  return b2bFetch(credentials, "/treasury");
}

export async function privyListPayees(
  _params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  return b2bFetch(credentials, "/treasury/payees");
}

export async function privyAddPayee(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const label = strParam(params, "label");
  const address = strParam(params, "address");
  if (!(label && address)) {
    return fail("label and address are required");
  }
  return b2bFetch(credentials, "/treasury/payees", {
    method: "POST",
    body: JSON.stringify({
      label,
      address,
      defaultAmountUsdc: strParam(params, "default_amount_usdc"),
      chain: strParam(params, "chain") ?? "base_sepolia",
    }),
  });
}

export async function privyCreateTreasuryIntent(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const amountUsdc = strParam(params, "amount_usdc") ?? strParam(params, "amountUsdc");
  const toAddress = strParam(params, "to_address") ?? strParam(params, "toAddress");
  if (!(amountUsdc && toAddress)) {
    return fail("amount_usdc and to_address are required");
  }
  return b2bFetch(credentials, "/treasury/intents", {
    method: "POST",
    body: JSON.stringify({
      amountUsdc,
      toAddress,
      payeeId: strParam(params, "payee_id") ?? strParam(params, "payeeId"),
    }),
  });
}

export async function privyGetTreasuryIntent(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const intentId = strParam(params, "intent_id") ?? strParam(params, "intentId");
  if (!intentId) {
    return fail("intent_id is required");
  }
  return b2bFetch(credentials, `/treasury/intents/${encodeURIComponent(intentId)}`);
}

export async function privyApproveTreasuryIntent(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const intentId = strParam(params, "intent_id") ?? strParam(params, "intentId");
  if (!intentId) {
    return fail("intent_id is required");
  }
  return b2bFetch(credentials, `/treasury/intents/${encodeURIComponent(intentId)}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
