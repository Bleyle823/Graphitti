import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/marketplace/listing";

export type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

export async function searchListedWorkflows(params: Record<string, unknown>) {
  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const chain = typeof params.chain === "string" ? params.chain : undefined;
  const workflowType =
    params.workflowType === "read" || params.workflowType === "write"
      ? params.workflowType
      : undefined;

  const filters = [
    eq(workflows.isListed, true),
    isNull(workflows.deletedAt),
  ];
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
