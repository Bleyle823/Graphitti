import { NextResponse } from "next/server";
import { mcpToolsList, type JsonRpcRequest } from "@/lib/mcp/json-rpc";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  return NextResponse.json(
    { name: `graphitti-${slug}`, tools: mcpToolsList(slug).tools },
    { headers: corsHeaders }
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const body = (await request.json().catch(() => ({}))) as JsonRpcRequest;
  const id = body.id ?? null;
  if (body.method === "initialize") {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: `graphitti-${slug}`, version: "1.0.0" },
        },
      },
      { headers: corsHeaders }
    );
  }
  if (body.method === "tools/list") {
    return NextResponse.json(
      { jsonrpc: "2.0", id, result: mcpToolsList(slug) },
      { headers: corsHeaders }
    );
  }
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              hint: `POST /api/mcp/workflows/${slug}/call`,
              slug,
            }),
          },
        ],
      },
    },
    { headers: corsHeaders }
  );
}
