import { NextResponse } from "next/server";
import {
  type JsonRpcRequest,
  mcpCallWorkflowResponse,
  mcpToolsList,
  searchListedWorkflows,
} from "@/lib/mcp/json-rpc";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, PAYMENT-SIGNATURE, PAYMENT-RESPONSE",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function jsonRpcResult(
  id: string | number | null,
  result: unknown
): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, result },
    { headers: corsHeaders }
  );
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string
): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { headers: corsHeaders }
  );
}

async function handleToolsCall(
  body: JsonRpcRequest,
  slug: string | undefined,
  request: Request
): Promise<NextResponse> {
  const id = body.id ?? null;
  const name = String(body.params?.name ?? "");
  const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
  if (name === "search_workflows") {
    const data = await searchListedWorkflows(args);
    return jsonRpcResult(id, {
      content: [{ type: "text", text: JSON.stringify(data) }],
    });
  }
  if (name !== "call_workflow") {
    return jsonRpcError(id, -32_601, `Unknown tool ${name}`);
  }
  const targetSlug = slug || String(args.slug ?? "");
  if (!targetSlug) {
    return jsonRpcError(id, -32_602, "slug is required");
  }
  const input =
    args.input && typeof args.input === "object"
      ? (args.input as Record<string, unknown>)
      : {};
  return mcpCallWorkflowResponse({
    slug: targetSlug,
    input,
    request,
    id,
    corsHeaders,
  });
}

async function handleRpc(
  body: JsonRpcRequest,
  slug: string | undefined,
  request: Request
): Promise<NextResponse> {
  const id = body.id ?? null;
  if (body.method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "graphitti", version: "1.0.0" },
    });
  }
  if (body.method === "tools/list") {
    return jsonRpcResult(id, mcpToolsList(slug));
  }
  if (body.method === "tools/call") {
    return await handleToolsCall(body, slug, request);
  }
  if (body.method === "notifications/initialized") {
    return jsonRpcResult(id, {});
  }
  return jsonRpcError(id, -32_601, `Unknown method ${body.method}`);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as JsonRpcRequest;
  return handleRpc(body, undefined, request);
}

export function GET() {
  return NextResponse.json(
    { name: "graphitti", tools: mcpToolsList().tools },
    { headers: corsHeaders }
  );
}
