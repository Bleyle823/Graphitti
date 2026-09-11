import { NextResponse } from "next/server";
import { executeListingCall } from "@/lib/marketplace/call-listing";
import { type JsonRpcRequest, mcpToolsList } from "@/lib/mcp/json-rpc";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, PAYMENT-SIGNATURE, PAYMENT-RESPONSE",
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

  if (body.method === "tools/call" && body.params?.name === "call_workflow") {
    const args = (body.params?.arguments ?? {}) as Record<string, unknown>;
    const input =
      args.input && typeof args.input === "object"
        ? (args.input as Record<string, unknown>)
        : {};

    const callRequest = new Request(
      `http://local/api/mcp/workflows/${slug}/call`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("Authorization")
            ? { Authorization: request.headers.get("Authorization")! }
            : {}),
          ...(request.headers.get("PAYMENT-SIGNATURE")
            ? { "PAYMENT-SIGNATURE": request.headers.get("PAYMENT-SIGNATURE")! }
            : {}),
          ...(request.headers.get("PAYMENT-RESPONSE")
            ? { "PAYMENT-RESPONSE": request.headers.get("PAYMENT-RESPONSE")! }
            : {}),
        },
        body: JSON.stringify(input),
      }
    );

    const response = await executeListingCall(slug, callRequest);
    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: response.status,
                ...((payload as Record<string, unknown>) ?? {}),
              }),
            },
          ],
        },
      },
      { headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code: -32_601, message: `Unknown method ${body.method}` },
    },
    { headers: corsHeaders }
  );
}
