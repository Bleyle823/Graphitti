import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { executeListingCall } from "@/lib/marketplace/call-listing";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/marketplace/listing";

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

export async function searchListedWorkflows(params: Record<string, unknown>) {
  const q = typeof params.q === "string" ? params.q : undefined;
  const category =
    typeof params.category === "string" ? params.category : undefined;
  const chain = typeof params.chain === "string" ? params.chain : undefined;
  const workflowType =
    params.workflowType === "read" || params.workflowType === "write"
      ? params.workflowType
      : undefined;

  const filters = [eq(workflows.isListed, true), isNull(workflows.deletedAt)];
  if (q) {
    filters.push(ilike(workflows.name, `%${q}%`));
  }
  if (category) {
    filters.push(eq(workflows.category, category));
  }
  if (chain) {
    filters.push(eq(workflows.chain, chain));
  }
  if (workflowType) {
    filters.push(eq(workflows.workflowType, workflowType));
  }

  const items = await db
    .select(LISTING_PUBLIC_COLUMNS)
    .from(workflows)
    .where(and(...filters))
    .orderBy(desc(workflows.listedAt))
    .limit(20);

  return { items, total: items.length };
}

export function mcpToolsList(slug?: string) {
  if (slug) {
    return {
      tools: [
        {
          name: "call_workflow",
          description: `Call the listed workflow ${slug}`,
          inputSchema: {
            type: "object",
            properties: { input: { type: "object" } },
          },
        },
      ],
    };
  }
  return {
    tools: [
      {
        name: "search_workflows",
        description: "Search listed Graphitti workflows",
        inputSchema: {
          type: "object",
          properties: {
            q: { type: "string" },
            category: { type: "string" },
            chain: { type: "string" },
            workflowType: { type: "string", enum: ["read", "write"] },
          },
        },
      },
      {
        name: "call_workflow",
        description: "Call a listed workflow by slug",
        inputSchema: {
          type: "object",
          properties: {
            slug: { type: "string" },
            input: { type: "object" },
          },
          required: ["slug"],
        },
      },
    ],
  };
}

export async function mcpCallWorkflowResponse(options: {
  slug: string;
  input: Record<string, unknown>;
  request: Request;
  id: string | number | null;
  corsHeaders: Record<string, string>;
}): Promise<NextResponse> {
  const authorization = options.request.headers.get("Authorization");
  const paymentSignature = options.request.headers.get("PAYMENT-SIGNATURE");
  const incomingPaymentResponse =
    options.request.headers.get("PAYMENT-RESPONSE");
  const callRequest = new Request(
    `http://local/api/mcp/workflows/${options.slug}/call`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
        ...(paymentSignature ? { "PAYMENT-SIGNATURE": paymentSignature } : {}),
        ...(incomingPaymentResponse
          ? { "PAYMENT-RESPONSE": incomingPaymentResponse }
          : {}),
      },
      body: JSON.stringify(options.input),
    }
  );

  const response = await executeListingCall(options.slug, callRequest);
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const headers: Record<string, string> = { ...options.corsHeaders };
  const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
  const paymentResponse = response.headers.get("PAYMENT-RESPONSE");
  if (paymentRequired) {
    headers["PAYMENT-REQUIRED"] = paymentRequired;
  }
  if (paymentResponse) {
    headers["PAYMENT-RESPONSE"] = paymentResponse;
  }
  if (paymentRequired || paymentResponse) {
    headers["Access-Control-Expose-Headers"] =
      "PAYMENT-REQUIRED, PAYMENT-RESPONSE";
  }

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: options.id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: response.status,
              ...payload,
            }),
          },
        ],
      },
    },
    {
      status: response.status === 402 ? 402 : 200,
      headers,
    }
  );
}
