import { NextResponse } from "next/server";
import { mcpToolsList, searchListedWorkflows, type JsonRpcRequest } from "@/lib/mcp/json-rpc";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

async function handleRpc(body: JsonRpcRequest, slug?: string) {
  const id = body.id ?? null;
  if (body.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "graphitti", version: "1.0.0" },
      },
    };
  }
  if (body.method === "tools/list") {
    return { jsonrpc: "2.0", id, result: mcpToolsList(slug) };
  }
  if (body.method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    if (name === "search_workflows") {
      const data = await searchListedWorkflows(args);
      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(data) }] },
      };
    }
    if (name === "call_workflow") {
      const targetSlug = slug || String(args.slug ?? "");
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                hint: `POST /api/mcp/workflows/${targetSlug}/call`,
                slug: targetSlug,
                input: args.input ?? {},
              }),
            },
          ],
        },
      };
    }
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Unknown tool ${name}` },
    };
  }
  if (body.method === "notifications/initialized") {
    return { jsonrpc: "2.0", id, result: {} };
  }
  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Unknown method ${body.method}` },
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as JsonRpcRequest;
  const result = await handleRpc(body);
  return NextResponse.json(result, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { name: "graphitti", tools: mcpToolsList().tools },
    { headers: corsHeaders }
  );
}
